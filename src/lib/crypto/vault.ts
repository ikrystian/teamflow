/**
 * Hierarchia kluczy sejfu (rozdział 6.3):
 *
 *   klucz prywatny użytkownika
 *     └─ otwiera kopię klucza sejfu klienta (key_grants, crypto_box_seal)
 *          └─ odszyfrowuje klucz wpisu (credentials.encryptedItemKey, AEAD z AD)
 *               └─ odszyfrowuje dane wpisu: część przeglądową i sekrety (AEAD z AD)
 *
 * Nadanie dostępu = zaszyfrowanie klucza sejfu kluczem publicznym nowej osoby — w przeglądarce
 * osoby uprawnionej, bez udziału serwera. Odebranie = usunięcie kopii + rotacja klucza sejfu.
 */
import { decodePublicKey } from "./user-keys";
import {
  aeadDecrypt,
  aeadDecryptJson,
  aeadEncrypt,
  aeadEncryptJson,
  CryptoError,
  generateKey,
  generateKeyPair,
  openSealed,
  sealTo,
  type KeyPair,
} from "./primitives";
import { fromBase64Url, toBase64Url, utf8 } from "./encoding";
import { wipe } from "./sodium";

export type KeyScope = "client" | "intake" | "credential";

export const grantContext = (scope: KeyScope, scopeId: string, version: number) =>
  `dostepnik:key-grant:v1:${scope}:${scopeId}:${version}`;

export const adItemKey = (credentialId: string, clientId: string, vaultKeyVersion: number) =>
  `dostepnik:item-key:v1:${credentialId}:${clientId}:${vaultKeyVersion}`;
export const adCredentialData = (credentialId: string) => `dostepnik:credential-data:v1:${credentialId}`;
export const adCredentialSecrets = (credentialId: string) => `dostepnik:credential-secrets:v1:${credentialId}`;
export const adAttachmentMeta = (attachmentId: string, credentialId: string) =>
  `dostepnik:attachment-meta:v1:${attachmentId}:${credentialId}`;
export const adAttachmentBody = (attachmentId: string, credentialId: string) =>
  `dostepnik:attachment-body:v1:${attachmentId}:${credentialId}`;
export const intakeContext = (requestId: string) => `dostepnik:intake:v1:${requestId}`;

// --- Kopie kluczy (key grants) ---------------------------------------------

export function sealKeyFor(publicKeyB64: string, key: Uint8Array, scope: KeyScope, scopeId: string, version: number) {
  return sealTo(decodePublicKey(publicKeyB64), key, grantContext(scope, scopeId, version));
}

export function openKeyGrant(keyPair: KeyPair, encryptedKey: string, scope: KeyScope, scopeId: string, version: number) {
  const key = openSealed(keyPair, encryptedKey, grantContext(scope, scopeId, version));
  if (key.length !== 32 && !(scope === "intake" && key.length === 64)) {
    wipe(key);
    throw new CryptoError("Nieprawidłowa długość klucza w kopii");
  }
  return key;
}

export const generateVaultKey = generateKey;
export const generateItemKey = generateKey;

// --- Klucz wpisu --------------------------------------------------------------

export function wrapItemKey(vaultKey: Uint8Array, itemKey: Uint8Array, credentialId: string, clientId: string, version: number) {
  return aeadEncrypt(vaultKey, itemKey, adItemKey(credentialId, clientId, version));
}

export function unwrapItemKey(vaultKey: Uint8Array, encryptedItemKey: string, credentialId: string, clientId: string, version: number) {
  return aeadDecrypt(vaultKey, encryptedItemKey, adItemKey(credentialId, clientId, version));
}

// --- Dane wpisu ---------------------------------------------------------------

export function encryptCredentialPayload<O, S>(itemKey: Uint8Array, credentialId: string, overview: O, secrets: S) {
  return {
    encryptedData: aeadEncryptJson(itemKey, overview, adCredentialData(credentialId)),
    encryptedSecrets: aeadEncryptJson(itemKey, secrets, adCredentialSecrets(credentialId)),
  };
}

export function decryptCredentialOverview<O>(itemKey: Uint8Array, credentialId: string, encryptedData: string): O {
  return aeadDecryptJson<O>(itemKey, encryptedData, adCredentialData(credentialId));
}

export function decryptCredentialSecrets<S>(itemKey: Uint8Array, credentialId: string, encryptedSecrets: string): S {
  return aeadDecryptJson<S>(itemKey, encryptedSecrets, adCredentialSecrets(credentialId));
}

// --- Załączniki ---------------------------------------------------------------

export type AttachmentMeta = { name: string; mime: string; size: number };

export function encryptAttachment(itemKey: Uint8Array, attachmentId: string, credentialId: string, body: Uint8Array, meta: AttachmentMeta) {
  return {
    encryptedMeta: aeadEncryptJson(itemKey, meta, adAttachmentMeta(attachmentId, credentialId)),
    ciphertext: aeadEncrypt(itemKey, body, adAttachmentBody(attachmentId, credentialId)),
  };
}

export function decryptAttachmentMeta(itemKey: Uint8Array, attachmentId: string, credentialId: string, encryptedMeta: string) {
  return aeadDecryptJson<AttachmentMeta>(itemKey, encryptedMeta, adAttachmentMeta(attachmentId, credentialId));
}

export function decryptAttachmentBody(itemKey: Uint8Array, attachmentId: string, credentialId: string, ciphertext: string) {
  return aeadDecrypt(itemKey, ciphertext, adAttachmentBody(attachmentId, credentialId));
}

// --- Skrzynka „Do przejrzenia” (prośby o dostęp) ---------------------------------

/** Para kluczy skrzynki: klucz publiczny jest jawny, prywatny trafia do osób uprawnionych jako key grant. */
export function generateIntakeKeyPair() {
  const kp = generateKeyPair();
  return { publicKey: toBase64Url(kp.publicKey), keyPair: kp };
}

/** Prywatny klucz skrzynki jest przechowywany w kopii razem z publicznym (64 B). */
export function packIntakeKeyPair(kp: KeyPair): Uint8Array {
  const out = new Uint8Array(64);
  out.set(kp.privateKey, 0);
  out.set(kp.publicKey, 32);
  return out;
}

export function unpackIntakeKeyPair(packed: Uint8Array): KeyPair {
  if (packed.length !== 64) throw new CryptoError("Nieprawidłowy klucz skrzynki");
  return { privateKey: packed.slice(0, 32), publicKey: packed.slice(32) };
}

/** Przeglądarka klienta agencji: szyfruje przekazywane dostępy kluczem publicznym skrzynki. */
export function sealIntakeSubmission(intakePublicKeyB64: string, requestId: string, payload: unknown) {
  const bytes = utf8.encode(JSON.stringify(payload));
  try {
    return sealTo(decodePublicKey(intakePublicKeyB64), bytes, intakeContext(requestId));
  } finally {
    wipe(bytes);
  }
}

export function openIntakeSubmission<T>(intakeKeyPair: KeyPair, requestId: string, ciphertext: string): T {
  const bytes = openSealed(intakeKeyPair, ciphertext, intakeContext(requestId));
  try {
    return JSON.parse(utf8.decode(bytes)) as T;
  } finally {
    wipe(bytes);
  }
}

export function keyToB64(key: Uint8Array) {
  return toBase64Url(key);
}

export function keyFromB64(b64: string) {
  return fromBase64Url(b64);
}
