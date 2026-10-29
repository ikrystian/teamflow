/**
 * Linki jednorazowe (rozdział 4.6). Klucz linku jest w części adresu po znaku #,
 * więc serwer go nie zna. Opcjonalne dodatkowe hasło jest mieszane z kluczem linku
 * przez Argon2id. Serwer zna tylko skrót „klucza dostępu” — dowód, że odbiorca ma link
 * (i hasło); dopiero wtedy wydaje szyfrogram i zalicza wyświetlenie.
 */
import { concatBytes, fromBase64Url, toBase64Url, toHex } from "./encoding";
import { aeadDecryptJson, aeadEncryptJson, CryptoError, keyedHash, randomBytes } from "./primitives";
import { getSodium, wipe } from "./sodium";

export const SHARE_PASSWORD_KDF = { opsLimit: 2, memLimit: 32 * 1024 * 1024 };

export const adShare = (shareId: string) => `dostepnik:share:v1:${shareId}`;

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return toHex(new Uint8Array(digest));
}

async function deriveShareKeys(shareId: string, linkKey: Uint8Array, password?: string, passwordSaltB64?: string) {
  const s = await getSodium();
  let base = linkKey;
  let pwKey: Uint8Array | null = null;
  if (password) {
    if (!passwordSaltB64) throw new CryptoError("Brak soli hasła linku");
    pwKey = s.crypto_pwhash(
      32,
      password.normalize("NFKC"),
      fromBase64Url(passwordSaltB64),
      SHARE_PASSWORD_KDF.opsLimit,
      SHARE_PASSWORD_KDF.memLimit,
      s.crypto_pwhash_ALG_ARGON2ID13,
    );
    base = concatBytes(linkKey, pwKey);
  }
  const encKey = keyedHash(base, `dostepnik:share:enc:v1:${shareId}`);
  const accessKey = keyedHash(base, `dostepnik:share:auth:v1:${shareId}`);
  if (pwKey) wipe(pwKey, base);
  return { encKey, accessKey };
}

export type CreatedShare = {
  ciphertext: string;
  authHash: string;
  passwordSalt: string | null;
  /** Fragment adresu (bez #) — trafia tylko do odbiorcy. */
  fragment: string;
};

export async function createShareCiphertext(shareId: string, payload: unknown, password?: string): Promise<CreatedShare> {
  const s = await getSodium();
  const linkKey = randomBytes(32);
  const passwordSalt = password ? toBase64Url(randomBytes(s.crypto_pwhash_SALTBYTES)) : null;
  const { encKey, accessKey } = await deriveShareKeys(shareId, linkKey, password, passwordSalt ?? undefined);
  try {
    return {
      ciphertext: aeadEncryptJson(encKey, payload, adShare(shareId)),
      authHash: await sha256Hex(accessKey),
      passwordSalt,
      fragment: `k=${toBase64Url(linkKey)}`,
    };
  } finally {
    wipe(linkKey, encKey, accessKey);
  }
}

export function parseShareFragment(fragment: string): Uint8Array {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const k = params.get("k");
  if (!k) throw new CryptoError("Link jest niekompletny — brakuje klucza po znaku #");
  const key = fromBase64Url(k);
  if (key.length !== 32) throw new CryptoError("Link jest uszkodzony");
  return key;
}

/** Odbiorca: wylicza klucz dostępu (wysyłany do serwera) i klucz odszyfrowania (zostaje lokalnie). */
export async function deriveShareAccess(shareId: string, fragment: string, password?: string, passwordSalt?: string | null) {
  const linkKey = parseShareFragment(fragment);
  const keys = await deriveShareKeys(shareId, linkKey, password, passwordSalt ?? undefined);
  wipe(linkKey);
  return { accessKey: toBase64Url(keys.accessKey), encKey: keys.encKey };
}

export function decryptShare<T>(encKey: Uint8Array, shareId: string, ciphertext: string): T {
  try {
    return aeadDecryptJson<T>(encKey, ciphertext, adShare(shareId));
  } finally {
    wipe(encKey);
  }
}

/** Serwer: porównuje skrót przesłanego klucza dostępu ze skrótem zapisanym przy tworzeniu linku. */
export async function verifyShareAccessKey(accessKeyB64: string, authHash: string): Promise<boolean> {
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(accessKeyB64);
  } catch {
    return false;
  }
  if (bytes.length !== 32) return false;
  const hash = await sha256Hex(bytes);
  if (hash.length !== authHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ authHash.charCodeAt(i);
  return diff === 0;
}
