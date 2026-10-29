/**
 * Odblokowanie sejfu passkeyem przez rozszerzenie WebAuthn PRF (faza kolejna, rozdział 6.4).
 * Wynik PRF (32 B) jest przepuszczany przez KDF i opakowuje klucz prywatny użytkownika.
 */
import { aeadDecrypt, aeadEncrypt, keyedHash } from "./primitives";
import { wipe } from "./sodium";

export const adPrfWrappedKey = (userId: string, credentialId: string) => `dostepnik:prf-private-key:v1:${userId}:${credentialId}`;

function prfToKey(prfOutput: Uint8Array) {
  return keyedHash(prfOutput, "dostepnik:prf-unlock:v1");
}

export function wrapPrivateKeyWithPrf(privateKey: Uint8Array, prfOutput: Uint8Array, userId: string, credentialId: string) {
  const key = prfToKey(prfOutput);
  try {
    return aeadEncrypt(key, privateKey, adPrfWrappedKey(userId, credentialId));
  } finally {
    wipe(key);
  }
}

export function unwrapPrivateKeyWithPrf(wrapped: string, prfOutput: Uint8Array, userId: string, credentialId: string) {
  const key = prfToKey(prfOutput);
  try {
    return aeadDecrypt(key, wrapped, adPrfWrappedKey(userId, credentialId));
  } finally {
    wipe(key);
  }
}
