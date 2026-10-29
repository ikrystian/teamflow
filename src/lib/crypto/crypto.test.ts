import { argon2id } from "@noble/hashes/argon2.js";
import { blake2b } from "@noble/hashes/blake2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  aeadDecrypt,
  aeadDecryptJson,
  aeadEncrypt,
  aeadEncryptJson,
  base32Decode,
  base32Encode,
  concatBytes,
  constantTimeEqual,
  createShareCiphertext,
  createUserKeys,
  crockfordDecode,
  crockfordEncode,
  CryptoError,
  decodeKey,
  decryptAttachmentBody,
  decryptAttachmentMeta,
  decryptCredentialOverview,
  decryptCredentialSecrets,
  decryptShare,
  deriveMasterKeys,
  deriveShareAccess,
  encodeKey,
  encryptAttachment,
  encryptCredentialPayload,
  ensureCrypto,
  fingerprint,
  formatRecoveryKey,
  fromBase64Url,
  generateIntakeKeyPair,
  generateItemKey,
  generateKey,
  generateKeyPair,
  generateSalt,
  generateVaultKey,
  hashAuthKey,
  keyedHash,
  keyFromB64,
  keyToB64,
  openIntakeSubmission,
  openKeyGrant,
  openSealed,
  packIntakeKeyPair,
  parseRecoveryKey,
  parseShareFragment,
  publicKeyFromPrivate,
  randomBytes,
  rewrapPrivateKey,
  sealIntakeSubmission,
  sealKeyFor,
  sealTo,
  toBase64Url,
  toHex,
  unlockWithMasterPassword,
  unlockWithRecoveryKey,
  unpackIntakeKeyPair,
  unwrapItemKey,
  unwrapPrivateKeyWithPrf,
  utf8,
  validateKdfParams,
  verifyAuthKey,
  verifyShareAccessKey,
  wipe,
  wrapItemKey,
  wrapPrivateKeyWithPrf,
  decodePublicKey,
  getSodium,
  type KdfParams,
} from "./index";
import { sodiumSync } from "./sodium";

const hex = (s: string) => Uint8Array.from(s.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
/** Szybkie parametry do testów (minimum dopuszczalne). */
const FAST: KdfParams = { alg: "argon2id13", opsLimit: 2, memLimit: 32 * 1024 * 1024 };

beforeAll(async () => {
  await ensureCrypto();
});

describe("kodowania", () => {
  it("base64url w obie strony i odrzucenie śmieci", () => {
    const b = randomBytes(37);
    expect(fromBase64Url(toBase64Url(b))).toEqual(b);
    expect(toBase64Url(new Uint8Array([0xfb, 0xff]))).toBe("-_8");
    expect(() => fromBase64Url("a+b/")).toThrow();
  });

  it("base32 — wektory RFC 4648", () => {
    const vectors: [string, string][] = [
      ["", ""],
      ["f", "MY"],
      ["fo", "MZXQ"],
      ["foo", "MZXW6"],
      ["foob", "MZXW6YQ"],
      ["fooba", "MZXW6YTB"],
      ["foobar", "MZXW6YTBOI"],
    ];
    for (const [plain, enc] of vectors) {
      expect(base32Encode(utf8.encode(plain))).toBe(enc);
      expect(utf8.decode(base32Decode(enc))).toBe(plain);
    }
    expect(utf8.decode(base32Decode("mzxw 6ytb-oi======"))).toBe("foobar");
    expect(() => base32Decode("ABC1")).toThrow();
  });

  it("Crockford base32 toleruje pomyłki I/L/O", () => {
    const b = randomBytes(34);
    const enc = crockfordEncode(b);
    expect(crockfordDecode(enc, 34)).toEqual(b);
    expect(crockfordDecode(enc.toLowerCase().replace(/1/g, "l").replace(/0/g, "o"), 34)).toEqual(b);
    expect(() => crockfordDecode("U", 1)).toThrow();
    expect(() => crockfordDecode(enc, 10)).toThrow();
  });

  it("pomocnicze: hex, concat, porównanie w stałym czasie", () => {
    expect(toHex(new Uint8Array([0, 15, 255]))).toBe("000fff");
    expect(concatBytes(new Uint8Array([1]), new Uint8Array([2, 3]))).toEqual(new Uint8Array([1, 2, 3]));
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
  });
});

describe("XChaCha20-Poly1305 (AEAD)", () => {
  it("wektor z draft-irtf-cfrg-xchacha-03 (A.3.1) i zgodność z @noble/ciphers", () => {
    const s = sodiumSync();
    const pt = utf8.encode(
      "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.",
    );
    const aad = hex("50515253c0c1c2c3c4c5c6c7");
    const key = hex("808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f");
    const nonce = hex("404142434445464748494a4b4c4d4e4f5051525354555657");
    const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(pt, aad, null, nonce, key);
    expect(toHex(ct.subarray(ct.length - 16))).toBe("c0875924c1c7987947deafd8780acf49");
    expect(toHex(ct.subarray(0, 16))).toBe("bd6d179d3e83d43b9576579493c0e939");
    expect(ct).toEqual(xchacha20poly1305(key, nonce, aad).encrypt(pt));
  });

  it("koperta formatu v1 jest zgodna z niezależną implementacją", () => {
    const key = generateKey();
    const pt = randomBytes(100);
    const env = fromBase64Url(aeadEncrypt(key, pt, "ad"));
    expect(env[0]).toBe(0x01);
    const nonce = env.subarray(1, 25);
    expect(xchacha20poly1305(key, nonce, utf8.encode("ad")).decrypt(env.subarray(25))).toEqual(pt);
  });

  it("szyfruje i odszyfrowuje JSON", () => {
    const key = generateKey();
    const env = aeadEncryptJson(key, { a: 1, b: "ź" }, "ctx");
    expect(aeadDecryptJson(key, env, "ctx")).toEqual({ a: 1, b: "ź" });
  });

  it("wykrywa podmianę danych uwierzytelnianych, klucza i treści", () => {
    const key = generateKey();
    const env = aeadEncrypt(key, utf8.encode("tajne"), "dostepnik:credential-data:v1:A");
    expect(() => aeadDecrypt(key, env, "dostepnik:credential-data:v1:B")).toThrow(CryptoError);
    expect(() => aeadDecrypt(generateKey(), env, "dostepnik:credential-data:v1:A")).toThrow(CryptoError);
    const raw = fromBase64Url(env);
    raw[raw.length - 1] ^= 1;
    expect(() => aeadDecrypt(key, toBase64Url(raw), "dostepnik:credential-data:v1:A")).toThrow(CryptoError);
  });

  it("odrzuca nieznaną wersję formatu, uszkodzone kodowanie i za krótkie dane", () => {
    const key = generateKey();
    const raw = fromBase64Url(aeadEncrypt(key, utf8.encode("x"), "ad"));
    raw[0] = 0x09;
    expect(() => aeadDecrypt(key, toBase64Url(raw), "ad")).toThrow(/wersja formatu/);
    expect(() => aeadDecrypt(key, "!!!", "ad")).toThrow(/Uszkodzony/);
    expect(() => aeadDecrypt(key, toBase64Url(new Uint8Array([1, 2, 3])), "ad")).toThrow(/Uszkodzony/);
    expect(() => aeadEncrypt(new Uint8Array(16), utf8.encode("x"), "ad")).toThrow(/długość klucza/);
  });

  it("każde szyfrowanie używa nowego nonce", () => {
    const key = generateKey();
    const a = aeadEncrypt(key, utf8.encode("x"), "ad");
    const b = aeadEncrypt(key, utf8.encode("x"), "ad");
    expect(a).not.toBe(b);
  });
});

describe("X25519 i sealed box", () => {
  it("wektor RFC 7748 (6.1) — klucz publiczny Alicji", () => {
    const priv = hex("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a");
    expect(toHex(publicKeyFromPrivate(priv))).toBe("8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a");
  });

  it("kopia klucza otwiera się tylko we właściwym kontekście i właściwym kluczem", () => {
    const kp = generateKeyPair();
    const other = generateKeyPair();
    const msg = randomBytes(32);
    const env = sealTo(kp.publicKey, msg, "ctx-1");
    expect(openSealed(kp, env, "ctx-1")).toEqual(msg);
    expect(() => openSealed(kp, env, "ctx-2")).toThrow(/innego zakresu/);
    expect(() => openSealed(other, env, "ctx-1")).toThrow(CryptoError);
    const raw = fromBase64Url(env);
    raw[0] = 0x01;
    expect(() => openSealed(kp, toBase64Url(raw), "ctx-1")).toThrow(/wersja formatu/);
    expect(() => openSealed(kp, "%%%", "ctx-1")).toThrow(/Uszkodzony/);
  });

  it("odcisk klucza ma stały format", () => {
    const fp = fingerprint(generateKeyPair().publicKey);
    expect(fp).toMatch(/^([0-9A-F]{4} ){7}[0-9A-F]{4}$/);
  });

  it("dekodowanie kluczy sprawdza długość", () => {
    const k = generateKey();
    expect(decodeKey(encodeKey(k))).toEqual(k);
    expect(() => decodeKey(toBase64Url(new Uint8Array(5)))).toThrow();
    expect(() => decodePublicKey(toBase64Url(new Uint8Array(5)))).toThrow();
    expect(keyFromB64(keyToB64(k))).toEqual(k);
  });
});

describe("BLAKE2b", () => {
  it("keyedHash zgodny z @noble/hashes", () => {
    const key = randomBytes(32);
    expect(keyedHash(key, "abc")).toEqual(blake2b(utf8.encode("abc"), { key, dkLen: 32 }));
    expect(keyedHash(key, utf8.encode("abc"), 16)).toEqual(blake2b(utf8.encode("abc"), { key, dkLen: 16 }));
  });
});

describe("hasło główne (Argon2id)", () => {
  it("Argon2id libsodium jest zgodny z niezależną implementacją @noble/hashes", async () => {
    const s = await getSodium();
    const salt = randomBytes(16);
    const ours = s.crypto_pwhash(32, "hasło-główne", salt, 2, 32 * 1024 * 1024, s.crypto_pwhash_ALG_ARGON2ID13);
    const theirs = argon2id(utf8.encode("hasło-główne"), salt, { t: 2, m: 32 * 1024, p: 1, dkLen: 32 });
    expect(ours).toEqual(theirs);
  });

  it("deterministycznie wyprowadza dwa różne podklucze", async () => {
    const salt = generateSalt();
    const a = await deriveMasterKeys("Correct Horse", salt, FAST);
    const b = await deriveMasterKeys("Correct Horse", salt, FAST);
    expect(a.encryptionKey).toEqual(b.encryptionKey);
    expect(a.authKey).toEqual(b.authKey);
    expect(a.encryptionKey).not.toEqual(a.authKey);
    const c = await deriveMasterKeys("Correct horse", salt, FAST);
    expect(c.encryptionKey).not.toEqual(a.encryptionKey);
  });

  it("normalizuje Unicode (NFKC)", async () => {
    const salt = generateSalt();
    const composed = await deriveMasterKeys("zażółć", salt, FAST);
    const decomposed = await deriveMasterKeys("zażółć".normalize("NFD"), salt, FAST);
    expect(composed.encryptionKey).toEqual(decomposed.encryptionKey);
  });

  it("odrzuca obniżone lub absurdalne parametry KDF i złą sól", async () => {
    expect(() => validateKdfParams({ alg: "argon2id13", opsLimit: 1, memLimit: 64 * 1024 * 1024 })).toThrow(/minimum/);
    expect(() => validateKdfParams({ alg: "argon2id13", opsLimit: 3, memLimit: 1024 })).toThrow(/minimum/);
    expect(() => validateKdfParams({ alg: "argon2id13", opsLimit: 99, memLimit: 64 * 1024 * 1024 })).toThrow(/zakresem/);
    expect(() => validateKdfParams({ alg: "scrypt" as "argon2id13", opsLimit: 3, memLimit: 64 * 1024 * 1024 })).toThrow(
      /algorytm/,
    );
    await expect(deriveMasterKeys("x", toBase64Url(new Uint8Array(3)), FAST)).rejects.toThrow(/sól/);
  });

  it("serwer weryfikuje skrót klucza uwierzytelniającego", async () => {
    const { authKey } = await deriveMasterKeys("pw", generateSalt(), FAST);
    const b64 = toBase64Url(authKey);
    const hash = await hashAuthKey(b64);
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyAuthKey(hash, b64)).toBe(true);
    expect(await verifyAuthKey(hash, toBase64Url(randomBytes(32)))).toBe(false);
    expect(await verifyAuthKey("nie-skrót", b64)).toBe(false);
  });
});

describe("klucze użytkownika i zestaw ratunkowy", () => {
  it("rejestracja → odblokowanie hasłem głównym", async () => {
    const { bundle, keyPair, recoveryKey } = await createUserKeys("user-1", "Moje hasło główne 2026!", FAST);
    expect(recoveryKey).toMatch(/^[0-9A-Z]{5}(-[0-9A-Z]{1,5})+$/);
    const stored = { userId: "user-1", ...bundle };
    const unlocked = await unlockWithMasterPassword(stored, "Moje hasło główne 2026!");
    expect(unlocked.keyPair.privateKey).toEqual(keyPair.privateKey);
    expect(unlocked.authKey).toBe(bundle.authKey);
    await expect(unlockWithMasterPassword(stored, "złe hasło")).rejects.toThrow(/Nieprawidłowe hasło główne/);
  });

  it("kopia klucza prywatnego jest związana z identyfikatorem użytkownika", async () => {
    const { bundle } = await createUserKeys("user-1", "pw", FAST);
    await expect(unlockWithMasterPassword({ userId: "user-2", ...bundle }, "pw")).rejects.toThrow(CryptoError);
  });

  it("wykrywa podmianę klucza publicznego przez serwer", async () => {
    const { bundle } = await createUserKeys("u", "pw", FAST);
    const fake = toBase64Url(generateKeyPair().publicKey);
    await expect(unlockWithMasterPassword({ userId: "u", ...bundle, publicKey: fake }, "pw")).rejects.toThrow(/nie pasuje/);
    const { recoveryKey } = await createUserKeys("u", "pw", FAST);
    const r = await createUserKeys("u", "pw", FAST);
    await expect(
      unlockWithRecoveryKey({ userId: "u", ...r.bundle, publicKey: fake }, r.recoveryKey),
    ).rejects.toThrow(/nie pasuje/);
    expect(recoveryKey).not.toBe(r.recoveryKey);
  });

  it("odzyskanie kluczem odzyskiwania i ustawienie nowego hasła głównego", async () => {
    const { bundle, keyPair, recoveryKey } = await createUserKeys("u", "stare", FAST);
    const recovered = await unlockWithRecoveryKey({ userId: "u", ...bundle }, recoveryKey.toLowerCase().replace(/-/g, " "));
    expect(recovered.privateKey).toEqual(keyPair.privateKey);

    const re = await rewrapPrivateKey("u", recovered, "nowe hasło", { params: FAST, newRecoveryKey: true });
    const stored2 = {
      userId: "u",
      ...bundle,
      encryptedPrivateKey: re.encryptedPrivateKey,
      kdfSalt: re.kdfSalt,
      kdfParams: re.kdfParams,
      recoveryEncryptedPrivateKey: re.recoveryEncryptedPrivateKey!,
    };
    expect((await unlockWithMasterPassword(stored2, "nowe hasło")).keyPair.privateKey).toEqual(keyPair.privateKey);
    await expect(unlockWithMasterPassword(stored2, "stare")).rejects.toThrow();
    expect((await unlockWithRecoveryKey(stored2, re.recoveryKey!)).privateKey).toEqual(keyPair.privateKey);
    await expect(unlockWithRecoveryKey(stored2, recoveryKey)).rejects.toThrow(/nie pasuje/);

    const reNoRecovery = await rewrapPrivateKey("u", recovered, "x", { params: FAST });
    expect(reNoRecovery.recoveryKey).toBeUndefined();
  });

  it("klucz odzyskiwania ma sumę kontrolną wychwytującą literówki", () => {
    const key = randomBytes(32);
    const text = formatRecoveryKey(key);
    expect(parseRecoveryKey(text)).toEqual(key);
    const chars = text.split("");
    const i = chars.findIndex((c) => c !== "-");
    chars[i] = chars[i] === "A" ? "B" : "A";
    expect(() => parseRecoveryKey(chars.join(""))).toThrow(/literówkę|Nieprawidłowy/);
    expect(() => parseRecoveryKey("ABC")).toThrow(/Nieprawidłowy klucz odzyskiwania/);
  });
});

describe("sejf: kopie kluczy, klucze wpisów, dane wpisów", () => {
  it("pełna ścieżka: kopia klucza sejfu → klucz wpisu → dane", () => {
    const alice = generateKeyPair();
    const vaultKey = generateVaultKey();
    const grant = sealKeyFor(toBase64Url(alice.publicKey), vaultKey, "client", "client-1", 1);
    const opened = openKeyGrant(alice, grant, "client", "client-1", 1);
    expect(opened).toEqual(vaultKey);
    expect(() => openKeyGrant(alice, grant, "client", "client-2", 1)).toThrow();
    expect(() => openKeyGrant(alice, grant, "client", "client-1", 2)).toThrow();

    const itemKey = generateItemKey();
    const wrapped = wrapItemKey(vaultKey, itemKey, "cred-1", "client-1", 1);
    expect(unwrapItemKey(vaultKey, wrapped, "cred-1", "client-1", 1)).toEqual(itemKey);
    expect(() => unwrapItemKey(vaultKey, wrapped, "cred-2", "client-1", 1)).toThrow(CryptoError);
    expect(() => unwrapItemKey(vaultKey, wrapped, "cred-1", "client-9", 1)).toThrow(CryptoError);

    const payload = encryptCredentialPayload(itemKey, "cred-1", { name: "FTP", login: "jan" }, { password: "s3cr3t" });
    expect(decryptCredentialOverview(itemKey, "cred-1", payload.encryptedData)).toEqual({ name: "FTP", login: "jan" });
    expect(decryptCredentialSecrets(itemKey, "cred-1", payload.encryptedSecrets)).toEqual({ password: "s3cr3t" });
    // Nie da się podmienić szyfrogramów między rekordami ani między częściami wpisu.
    expect(() => decryptCredentialOverview(itemKey, "cred-2", payload.encryptedData)).toThrow(CryptoError);
    expect(() => decryptCredentialSecrets(itemKey, "cred-1", payload.encryptedData)).toThrow(CryptoError);
  });

  it("kopia klucza o nieprawidłowej długości jest odrzucana", () => {
    const kp = generateKeyPair();
    const env = sealKeyFor(toBase64Url(kp.publicKey), new Uint8Array(10), "client", "c", 1);
    expect(() => openKeyGrant(kp, env, "client", "c", 1)).toThrow(/długość/);
  });

  it("załączniki: metadane i treść związane z wpisem", () => {
    const itemKey = generateItemKey();
    const body = randomBytes(2048);
    const enc = encryptAttachment(itemKey, "att-1", "cred-1", body, { name: "id_rsa", mime: "text/plain", size: 2048 });
    expect(decryptAttachmentMeta(itemKey, "att-1", "cred-1", enc.encryptedMeta).name).toBe("id_rsa");
    expect(decryptAttachmentBody(itemKey, "att-1", "cred-1", enc.ciphertext)).toEqual(body);
    expect(() => decryptAttachmentBody(itemKey, "att-1", "cred-2", enc.ciphertext)).toThrow(CryptoError);
  });

  it("skrzynka „Do przejrzenia”: klient szyfruje, uprawniona osoba odczytuje", () => {
    const intake = generateIntakeKeyPair();
    const member = generateKeyPair();
    const packed = packIntakeKeyPair(intake.keyPair);
    const grant = sealKeyFor(toBase64Url(member.publicKey), packed, "intake", "ws-1", 1);
    const intakeKp = unpackIntakeKeyPair(openKeyGrant(member, grant, "intake", "ws-1", 1));
    const ct = sealIntakeSubmission(intake.publicKey, "req-1", { items: [{ type: "ftp", password: "x" }] });
    expect(openIntakeSubmission(intakeKp, "req-1", ct)).toEqual({ items: [{ type: "ftp", password: "x" }] });
    expect(() => openIntakeSubmission(intakeKp, "req-2", ct)).toThrow();
    expect(() => unpackIntakeKeyPair(new Uint8Array(10))).toThrow();
  });
});

describe("linki jednorazowe", () => {
  it("bez hasła: odbiorca z fragmentem odszyfrowuje, serwer weryfikuje dowód posiadania linku", async () => {
    const created = await createShareCiphertext("share-1", { login: "a", password: "b" });
    expect(created.passwordSalt).toBeNull();
    const access = await deriveShareAccess("share-1", `#${created.fragment}`);
    expect(await verifyShareAccessKey(access.accessKey, created.authHash)).toBe(true);
    expect(decryptShare(access.encKey, "share-1", created.ciphertext)).toEqual({ login: "a", password: "b" });
  });

  it("z hasłem: złe hasło nie daje dostępu", async () => {
    const created = await createShareCiphertext("share-2", { x: 1 }, "hasło-linku");
    expect(created.passwordSalt).not.toBeNull();
    const bad = await deriveShareAccess("share-2", created.fragment, "inne", created.passwordSalt);
    expect(await verifyShareAccessKey(bad.accessKey, created.authHash)).toBe(false);
    expect(() => decryptShare(bad.encKey, "share-2", created.ciphertext)).toThrow(CryptoError);
    const good = await deriveShareAccess("share-2", created.fragment, "hasło-linku", created.passwordSalt);
    expect(await verifyShareAccessKey(good.accessKey, created.authHash)).toBe(true);
    expect(decryptShare(good.encKey, "share-2", created.ciphertext)).toEqual({ x: 1 });
    await expect(deriveShareAccess("share-2", created.fragment, "hasło-linku", null)).rejects.toThrow(/soli/);
  });

  it("szyfrogram linku jest związany z identyfikatorem linku", async () => {
    const created = await createShareCiphertext("share-3", { x: 1 });
    const access = await deriveShareAccess("share-4", created.fragment);
    expect(await verifyShareAccessKey(access.accessKey, created.authHash)).toBe(false);
  });

  it("odrzuca niekompletne lub uszkodzone fragmenty i klucze dostępu", async () => {
    expect(() => parseShareFragment("")).toThrow(/niekompletny/);
    expect(() => parseShareFragment("k=abc")).toThrow(/uszkodzony/);
    expect(await verifyShareAccessKey("%%%", "00")).toBe(false);
    expect(await verifyShareAccessKey(toBase64Url(new Uint8Array(5)), "00")).toBe(false);
    expect(await verifyShareAccessKey(toBase64Url(new Uint8Array(32)), "00")).toBe(false);
  });
});

describe("PRF (odblokowanie passkeyem)", () => {
  it("opakowuje i odpakowuje klucz prywatny wynikiem PRF", () => {
    const priv = generateKeyPair().privateKey;
    const prf = randomBytes(32);
    const wrapped = wrapPrivateKeyWithPrf(priv, prf, "u", "cred");
    expect(unwrapPrivateKeyWithPrf(wrapped, prf, "u", "cred")).toEqual(priv);
    expect(() => unwrapPrivateKeyWithPrf(wrapped, randomBytes(32), "u", "cred")).toThrow(CryptoError);
    expect(() => unwrapPrivateKeyWithPrf(wrapped, prf, "u", "other")).toThrow(CryptoError);
  });
});

describe("zerowanie pamięci", () => {
  it("wipe zeruje bufory i ignoruje puste", () => {
    const a = randomBytes(16);
    wipe(a, null, undefined, new Uint8Array(0));
    expect(a.every((b) => b === 0)).toBe(true);
  });
});
