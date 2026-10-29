/**
 * Prymitywy kryptograficzne z wersjonowaniem formatu.
 *
 * Każdy szyfrogram zaczyna się bajtem wersji formatu (rozdział 6.3: „Każdy szyfrogram ma
 * numer wersji formatu, co pozwoli kiedyś zmienić algorytm”):
 *   0x01 — XChaCha20-Poly1305-IETF: [0x01][nonce 24 B][szyfrogram + tag 16 B]
 *   0x02 — crypto_box_seal (X25519 + XSalsa20-Poly1305): [0x02][sealed box]
 * Dane uwierzytelniane (AD) wiążą szyfrogram z rekordem — nie da się go przenieść
 * do innego wpisu lub sejfu bez wykrycia.
 */
import { concatBytes, fromBase64Url, toBase64Url, utf8 } from "./encoding";
import { getSodium, sodiumSync, wipe } from "./sodium";

export const FORMAT_AEAD_V1 = 0x01;
export const FORMAT_SEAL_V1 = 0x02;
export const KEY_BYTES = 32;

export class CryptoError extends Error {
  constructor(message = "Nie udało się odszyfrować danych — błędny klucz lub dane zostały zmienione") {
    super(message);
    this.name = "CryptoError";
  }
}

export async function ensureCrypto() {
  await getSodium();
}

export function randomBytes(n: number): Uint8Array {
  return sodiumSync().randombytes_buf(n);
}

export function generateKey(): Uint8Array {
  return sodiumSync().crypto_aead_xchacha20poly1305_ietf_keygen();
}

/** Szyfruje bajty kluczem symetrycznym z danymi uwierzytelnianymi. Zwraca base64url. */
export function aeadEncrypt(key: Uint8Array, plaintext: Uint8Array, ad: string): string {
  const s = sodiumSync();
  if (key.length !== KEY_BYTES) throw new CryptoError("Nieprawidłowa długość klucza");
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, utf8.encode(ad), null, nonce, key);
  return toBase64Url(concatBytes(new Uint8Array([FORMAT_AEAD_V1]), nonce, ct));
}

export function aeadDecrypt(key: Uint8Array, envelope: string, ad: string): Uint8Array {
  const s = sodiumSync();
  let raw: Uint8Array;
  try {
    raw = fromBase64Url(envelope);
  } catch {
    throw new CryptoError("Uszkodzony szyfrogram");
  }
  if (raw[0] !== FORMAT_AEAD_V1) throw new CryptoError(`Nieobsługiwana wersja formatu: ${raw[0]}`);
  const npub = s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  if (raw.length < 1 + npub + s.crypto_aead_xchacha20poly1305_ietf_ABYTES) throw new CryptoError("Uszkodzony szyfrogram");
  const nonce = raw.subarray(1, 1 + npub);
  const ct = raw.subarray(1 + npub);
  try {
    return s.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, utf8.encode(ad), nonce, key);
  } catch {
    throw new CryptoError();
  }
}

export function aeadEncryptJson(key: Uint8Array, value: unknown, ad: string): string {
  const bytes = utf8.encode(JSON.stringify(value));
  try {
    return aeadEncrypt(key, bytes, ad);
  } finally {
    wipe(bytes);
  }
}

export function aeadDecryptJson<T>(key: Uint8Array, envelope: string, ad: string): T {
  const bytes = aeadDecrypt(key, envelope, ad);
  try {
    return JSON.parse(utf8.decode(bytes)) as T;
  } finally {
    wipe(bytes);
  }
}

export type KeyPair = { publicKey: Uint8Array; privateKey: Uint8Array };

export function generateKeyPair(): KeyPair {
  const kp = sodiumSync().crypto_box_keypair();
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

export function publicKeyFromPrivate(privateKey: Uint8Array): Uint8Array {
  return sodiumSync().crypto_scalarmult_base(privateKey);
}

/**
 * Anonimowe szyfrowanie kluczem publicznym (crypto_box_seal). Wiadomość jest poprzedzona
 * etykietą kontekstu, sprawdzaną przy odszyfrowaniu — kopii klucza nie da się użyć w innym zakresie.
 */
export function sealTo(publicKey: Uint8Array, message: Uint8Array, context: string): string {
  const s = sodiumSync();
  const ctx = utf8.encode(`${context}\u0000`);
  const payload = concatBytes(ctx, message);
  try {
    const sealed = s.crypto_box_seal(payload, publicKey);
    return toBase64Url(concatBytes(new Uint8Array([FORMAT_SEAL_V1]), sealed));
  } finally {
    wipe(payload);
  }
}

export function openSealed(keyPair: KeyPair, envelope: string, context: string): Uint8Array {
  const s = sodiumSync();
  let raw: Uint8Array;
  try {
    raw = fromBase64Url(envelope);
  } catch {
    throw new CryptoError("Uszkodzony szyfrogram");
  }
  if (raw[0] !== FORMAT_SEAL_V1) throw new CryptoError(`Nieobsługiwana wersja formatu: ${raw[0]}`);
  let payload: Uint8Array;
  try {
    payload = s.crypto_box_seal_open(raw.subarray(1), keyPair.publicKey, keyPair.privateKey);
  } catch {
    throw new CryptoError();
  }
  const ctx = utf8.encode(`${context}\u0000`);
  const prefix = payload.subarray(0, ctx.length);
  if (prefix.length !== ctx.length || !s.memcmp(prefix, ctx)) {
    wipe(payload);
    throw new CryptoError("Kopia klucza należy do innego zakresu");
  }
  const message = payload.slice(ctx.length);
  wipe(payload);
  return message;
}

/** BLAKE2b z kluczem (crypto_generichash). */
export function keyedHash(key: Uint8Array, message: string | Uint8Array, length = 32): Uint8Array {
  return sodiumSync().crypto_generichash(length, typeof message === "string" ? utf8.encode(message) : message, key);
}

/** Odcisk klucza publicznego do weryfikacji poza systemem (np. przez telefon). */
export function fingerprint(publicKey: Uint8Array): string {
  const h = sodiumSync().crypto_generichash(16, publicKey, null);
  const hex = Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return hex.match(/.{4}/g)!.join(" ");
}

export function encodeKey(bytes: Uint8Array): string {
  return toBase64Url(bytes);
}

export function decodeKey(s: string): Uint8Array {
  const b = fromBase64Url(s);
  if (b.length !== KEY_BYTES) throw new CryptoError("Nieprawidłowa długość klucza");
  return b;
}
