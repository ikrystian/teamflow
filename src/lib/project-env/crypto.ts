import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

/**
 * Szyfrowanie treści plików .env projektów po stronie serwera: AES-256-GCM z losowym IV.
 * Format zapisu: `v1.<base64url(iv | tag | szyfrogram)>`. Prefiks wersji pozwala później
 * zmienić algorytm lub klucz bez zgadywania, jak odczytać starsze wpisy.
 *
 * `aad` (dane uwierzytelniane, np. id projektu) nie jest zapisywany w blobie, ale musi być
 * taki sam przy odszyfrowaniu — dzięki temu szyfrogramu nie da się podmienić między projektami.
 * Klucz jest argumentem (a nie importem `env`), żeby moduł dało się testować w izolacji.
 */

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function assertKey(key: Buffer) {
  if (key.length !== KEY_BYTES) throw new Error("Klucz szyfrowania plików .env musi mieć 32 bajty");
}

export function encryptEnv(plaintext: string, aad: string, key: Buffer): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}.${Buffer.concat([iv, tag, data]).toString("base64url")}`;
}

export function decryptEnv(blob: string, aad: string, key: Buffer): string {
  assertKey(key);
  const dot = blob.indexOf(".");
  if (dot === -1 || blob.slice(0, dot) !== VERSION) throw new Error("Nieznany format zaszyfrowanego pliku .env");
  const raw = Buffer.from(blob.slice(dot + 1), "base64url");
  if (raw.length < IV_BYTES + TAG_BYTES) throw new Error("Uszkodzony zaszyfrowany plik .env");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const data = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  // Błąd uwierzytelnienia (zły klucz, zmieniony blob lub AAD) rzuca wyjątek z final().
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
