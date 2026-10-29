/**
 * Hasło główne sejfu → klucze (rozdział 6.3).
 *
 *   hasło główne ──Argon2id(sól, ops, mem)──▶ klucz główny (32 B)
 *      klucz główny ──KDF(id=1)──▶ klucz szyfrujący (KEK) — odszyfrowuje klucz prywatny
 *      klucz główny ──KDF(id=2)──▶ klucz uwierzytelniający — jego skrót zna serwer (step-up)
 *
 * Hasło główne i klucz główny nigdy nie opuszczają przeglądarki.
 */
import { fromBase64Url, toBase64Url } from "./encoding";
import { KEY_BYTES, randomBytes } from "./primitives";
import { getSodium, sodiumSync, wipe } from "./sodium";

export type KdfParams = { alg: "argon2id13"; opsLimit: number; memLimit: number };

/**
 * Parametry domyślne: 3 przebiegi, 64 MiB — na typowym laptopie ok. 0,5–1 s w WASM.
 * Minimalne wartości chronią przed obniżeniem parametrów przez złośliwy serwer.
 */
export const DEFAULT_KDF_PARAMS: KdfParams = { alg: "argon2id13", opsLimit: 3, memLimit: 64 * 1024 * 1024 };
export const MIN_KDF_PARAMS = { opsLimit: 2, memLimit: 32 * 1024 * 1024 };
const KDF_CONTEXT = "DstpMstr";
const SUBKEY_ENCRYPTION = 1;
const SUBKEY_AUTH = 2;

export function validateKdfParams(p: KdfParams) {
  if (p.alg !== "argon2id13") throw new Error("Nieobsługiwany algorytm KDF");
  if (p.opsLimit < MIN_KDF_PARAMS.opsLimit || p.memLimit < MIN_KDF_PARAMS.memLimit) {
    throw new Error("Parametry KDF są poniżej minimum bezpieczeństwa");
  }
  if (p.opsLimit > 20 || p.memLimit > 1024 * 1024 * 1024) throw new Error("Parametry KDF są poza zakresem");
}

export function generateSalt(): string {
  return toBase64Url(randomBytes(sodiumSync().crypto_pwhash_SALTBYTES));
}

export type MasterKeys = { encryptionKey: Uint8Array; authKey: Uint8Array };

export async function deriveMasterKeys(password: string, saltB64: string, params: KdfParams): Promise<MasterKeys> {
  const s = await getSodium();
  validateKdfParams(params);
  const salt = fromBase64Url(saltB64);
  if (salt.length !== s.crypto_pwhash_SALTBYTES) throw new Error("Nieprawidłowa sól");
  const master = s.crypto_pwhash(
    KEY_BYTES,
    password.normalize("NFKC"),
    salt,
    params.opsLimit,
    params.memLimit,
    s.crypto_pwhash_ALG_ARGON2ID13,
  );
  try {
    return {
      encryptionKey: s.crypto_kdf_derive_from_key(KEY_BYTES, SUBKEY_ENCRYPTION, KDF_CONTEXT, master),
      authKey: s.crypto_kdf_derive_from_key(KEY_BYTES, SUBKEY_AUTH, KDF_CONTEXT, master),
    };
  } finally {
    wipe(master);
  }
}

/** Klucz uwierzytelniający w postaci wysyłanej do serwera (przy rejestracji i step-up). */
export function encodeAuthKey(authKey: Uint8Array): string {
  return toBase64Url(authKey);
}

/** Serwer: skrót Argon2id klucza uwierzytelniającego (crypto_pwhash_str). */
export async function hashAuthKey(authKeyB64: string): Promise<string> {
  const s = await getSodium();
  return s.crypto_pwhash_str(authKeyB64, s.crypto_pwhash_OPSLIMIT_INTERACTIVE, s.crypto_pwhash_MEMLIMIT_INTERACTIVE);
}

export async function verifyAuthKey(hash: string, authKeyB64: string): Promise<boolean> {
  const s = await getSodium();
  try {
    return s.crypto_pwhash_str_verify(hash, authKeyB64);
  } catch {
    return false;
  }
}
