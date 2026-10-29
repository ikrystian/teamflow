/**
 * Klucze użytkownika: para X25519, kopia klucza prywatnego zaszyfrowana kluczem z hasła
 * głównego oraz druga kopia zaszyfrowana kluczem odzyskiwania (zestaw ratunkowy).
 */
import { crockfordDecode, crockfordEncode, fromBase64Url, toBase64Url } from "./encoding";
import { DEFAULT_KDF_PARAMS, deriveMasterKeys, encodeAuthKey, generateSalt, type KdfParams } from "./master";
import {
  aeadDecrypt,
  aeadEncrypt,
  CryptoError,
  generateKeyPair,
  keyedHash,
  publicKeyFromPrivate,
  randomBytes,
  type KeyPair,
} from "./primitives";
import { getSodium, wipe } from "./sodium";

const RECOVERY_KEY_BYTES = 32;
const RECOVERY_CHECK_BYTES = 2;

export const adPrivateKey = (userId: string) => `dostepnik:user-private-key:v1:${userId}`;
export const adRecoveryPrivateKey = (userId: string) => `dostepnik:user-private-key-recovery:v1:${userId}`;

export type UserKeyBundle = {
  publicKey: string;
  encryptedPrivateKey: string;
  recoveryEncryptedPrivateKey: string;
  kdfSalt: string;
  kdfParams: KdfParams;
  /** Klucz uwierzytelniający (base64url) — serwer przechowuje wyłącznie jego skrót. */
  authKey: string;
};

// --- Klucz odzyskiwania -------------------------------------------------------

function recoveryChecksum(key: Uint8Array): Uint8Array {
  return keyedHash(new Uint8Array(32), key, 16).subarray(0, RECOVERY_CHECK_BYTES);
}

/** Format do druku: grupy po 5 znaków Crockford Base32 (z sumą kontrolną). */
export function formatRecoveryKey(key: Uint8Array): string {
  const withCheck = new Uint8Array(RECOVERY_KEY_BYTES + RECOVERY_CHECK_BYTES);
  withCheck.set(key);
  withCheck.set(recoveryChecksum(key), RECOVERY_KEY_BYTES);
  return crockfordEncode(withCheck).match(/.{1,5}/g)!.join("-");
}

export function parseRecoveryKey(input: string): Uint8Array {
  let raw: Uint8Array;
  try {
    raw = crockfordDecode(input, RECOVERY_KEY_BYTES + RECOVERY_CHECK_BYTES);
  } catch {
    throw new CryptoError("Nieprawidłowy klucz odzyskiwania — sprawdź, czy przepisano go w całości");
  }
  const key = raw.slice(0, RECOVERY_KEY_BYTES);
  const check = raw.subarray(RECOVERY_KEY_BYTES);
  const expected = recoveryChecksum(key);
  if (check[0] !== expected[0] || check[1] !== expected[1]) {
    throw new CryptoError("Klucz odzyskiwania zawiera literówkę (niezgodna suma kontrolna)");
  }
  return key;
}

// --- Tworzenie i odblokowanie -------------------------------------------------

export type CreatedUserKeys = {
  bundle: UserKeyBundle;
  keyPair: KeyPair;
  /** Do wyświetlenia i wydruku w zestawie ratunkowym — nigdy nie trafia na serwer. */
  recoveryKey: string;
};

export async function createUserKeys(userId: string, masterPassword: string, params = DEFAULT_KDF_PARAMS): Promise<CreatedUserKeys> {
  await getSodium();
  const keyPair = generateKeyPair();
  const kdfSalt = generateSalt();
  const { encryptionKey, authKey } = await deriveMasterKeys(masterPassword, kdfSalt, params);
  const recovery = randomBytes(RECOVERY_KEY_BYTES);
  try {
    return {
      keyPair,
      recoveryKey: formatRecoveryKey(recovery),
      bundle: {
        publicKey: toBase64Url(keyPair.publicKey),
        encryptedPrivateKey: aeadEncrypt(encryptionKey, keyPair.privateKey, adPrivateKey(userId)),
        recoveryEncryptedPrivateKey: aeadEncrypt(recovery, keyPair.privateKey, adRecoveryPrivateKey(userId)),
        kdfSalt,
        kdfParams: params,
        authKey: encodeAuthKey(authKey),
      },
    };
  } finally {
    wipe(encryptionKey, authKey, recovery);
  }
}

export type StoredUserKeys = {
  userId: string;
  publicKey: string;
  encryptedPrivateKey: string;
  recoveryEncryptedPrivateKey: string;
  kdfSalt: string;
  kdfParams: KdfParams;
};

function checkKeyPair(privateKey: Uint8Array, publicKeyB64: string): KeyPair {
  const publicKey = publicKeyFromPrivate(privateKey);
  if (toBase64Url(publicKey) !== publicKeyB64) {
    wipe(privateKey);
    throw new CryptoError("Klucz publiczny nie pasuje do klucza prywatnego");
  }
  return { publicKey, privateKey };
}

/** Odblokowanie sejfu hasłem głównym. Błędne hasło = błąd uwierzytelnienia szyfrogramu. */
export async function unlockWithMasterPassword(
  stored: StoredUserKeys,
  masterPassword: string,
): Promise<{ keyPair: KeyPair; authKey: string }> {
  const { encryptionKey, authKey } = await deriveMasterKeys(masterPassword, stored.kdfSalt, stored.kdfParams);
  try {
    let privateKey: Uint8Array;
    try {
      privateKey = aeadDecrypt(encryptionKey, stored.encryptedPrivateKey, adPrivateKey(stored.userId));
    } catch {
      throw new CryptoError("Nieprawidłowe hasło główne");
    }
    return { keyPair: checkKeyPair(privateKey, stored.publicKey), authKey: encodeAuthKey(authKey) };
  } finally {
    wipe(encryptionKey, authKey);
  }
}

export async function unlockWithRecoveryKey(stored: StoredUserKeys, recoveryKeyText: string): Promise<KeyPair> {
  await getSodium();
  const recovery = parseRecoveryKey(recoveryKeyText);
  try {
    const privateKey = aeadDecrypt(recovery, stored.recoveryEncryptedPrivateKey, adRecoveryPrivateKey(stored.userId));
    return checkKeyPair(privateKey, stored.publicKey);
  } catch (e) {
    if (e instanceof CryptoError && e.message.includes("pasuje")) throw e;
    throw new CryptoError("Klucz odzyskiwania nie pasuje do tego konta");
  } finally {
    wipe(recovery);
  }
}

/**
 * Zmiana hasła głównego (także po odzyskaniu kluczem odzyskiwania).
 * Para kluczy zostaje ta sama, więc kopie kluczy sejfów pozostają ważne.
 * Opcjonalnie generuje nowy klucz odzyskiwania.
 */
export async function rewrapPrivateKey(
  userId: string,
  keyPair: KeyPair,
  newMasterPassword: string,
  options: { newRecoveryKey?: boolean; params?: KdfParams } = {},
): Promise<{
  encryptedPrivateKey: string;
  kdfSalt: string;
  kdfParams: KdfParams;
  authKey: string;
  recoveryEncryptedPrivateKey?: string;
  recoveryKey?: string;
}> {
  const params = options.params ?? DEFAULT_KDF_PARAMS;
  const kdfSalt = generateSalt();
  const { encryptionKey, authKey } = await deriveMasterKeys(newMasterPassword, kdfSalt, params);
  try {
    const result: Awaited<ReturnType<typeof rewrapPrivateKey>> = {
      encryptedPrivateKey: aeadEncrypt(encryptionKey, keyPair.privateKey, adPrivateKey(userId)),
      kdfSalt,
      kdfParams: params,
      authKey: encodeAuthKey(authKey),
    };
    if (options.newRecoveryKey) {
      const recovery = randomBytes(RECOVERY_KEY_BYTES);
      result.recoveryEncryptedPrivateKey = aeadEncrypt(recovery, keyPair.privateKey, adRecoveryPrivateKey(userId));
      result.recoveryKey = formatRecoveryKey(recovery);
      wipe(recovery);
    }
    return result;
  } finally {
    wipe(encryptionKey, authKey);
  }
}

export function decodePublicKey(b64: string): Uint8Array {
  const pk = fromBase64Url(b64);
  if (pk.length !== 32) throw new CryptoError("Nieprawidłowy klucz publiczny");
  return pk;
}
