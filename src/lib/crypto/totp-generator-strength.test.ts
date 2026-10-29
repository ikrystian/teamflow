import { describe, expect, it, vi } from "vitest";
import { utf8, base32Encode } from "./encoding";
import {
  DEFAULT_PASSPHRASE_OPTIONS,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassphrase,
  generatePassword,
  passphraseEntropy,
  passwordEntropy,
  randomInt,
} from "./generator";
import { clearPwnedCache, evaluatePassword, findSuffixCount, isWeakScore, kAnonymitySplit, pwnedCount, sha1Hex } from "./strength";
import { hotp, isValidTotpInput, parseTotp, totp } from "./totp";

describe("HOTP — wektory RFC 4226 (dodatek D)", () => {
  it("liczniki 0–9", async () => {
    const secret = utf8.encode("12345678901234567890");
    const expected = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"];
    for (let i = 0; i < expected.length; i++) expect(await hotp(secret, i)).toBe(expected[i]);
  });
});

describe("TOTP — wektory RFC 6238 (dodatek B)", () => {
  const cases: [number, string, string, string][] = [
    [59, "94287082", "46119246", "90693936"],
    [1111111109, "07081804", "68084774", "25091201"],
    [1111111111, "14050471", "67062674", "99943326"],
    [1234567890, "89005924", "91819424", "93441116"],
    [2000000000, "69279037", "90698825", "38618901"],
    [20000000000, "65353130", "77737706", "47863826"],
  ];
  const sha1 = utf8.encode("12345678901234567890");
  const sha256 = utf8.encode("12345678901234567890123456789012");
  const sha512 = utf8.encode("1234567890123456789012345678901234567890123456789012345678901234");

  it.each(cases)("T=%i", async (t, c1, c256, c512) => {
    const ms = t * 1000;
    expect((await totp({ secret: sha1, algorithm: "SHA-1", digits: 8, period: 30 }, ms)).code).toBe(c1);
    expect((await totp({ secret: sha256, algorithm: "SHA-256", digits: 8, period: 30 }, ms)).code).toBe(c256);
    expect((await totp({ secret: sha512, algorithm: "SHA-512", digits: 8, period: 30 }, ms)).code).toBe(c512);
  });

  it("liczy pozostały czas ważności", async () => {
    const r = await totp({ secret: sha1, algorithm: "SHA-1", digits: 6, period: 30 }, 59_000);
    expect(r.remaining).toBe(1);
    expect(r.period).toBe(30);
  });

  it("parsuje sekret base32 i adres otpauth://", () => {
    const b32 = base32Encode(sha1);
    expect(parseTotp(b32).secret).toEqual(sha1);
    const cfg = parseTotp(`otpauth://totp/ACME:jan@example.com?secret=${b32}&issuer=ACME&algorithm=SHA256&digits=8&period=60`);
    expect(cfg).toMatchObject({ algorithm: "SHA-256", digits: 8, period: 60, issuer: "ACME", account: "jan@example.com" });
    expect(parseTotp(`otpauth://totp/konto?secret=${b32}`).account).toBe("konto");
    expect(isValidTotpInput(b32)).toBe(true);
    expect(isValidTotpInput("nie!")).toBe(false);
  });

  it("odrzuca nieobsługiwane konfiguracje", () => {
    const b32 = base32Encode(sha1);
    expect(() => parseTotp(`otpauth://hotp/x?secret=${b32}`)).toThrow(/TOTP/);
    expect(() => parseTotp("otpauth://totp/x")).toThrow(/sekretu/);
    expect(() => parseTotp(`otpauth://totp/x?secret=${b32}&algorithm=MD5`)).toThrow(/algorytm/);
    expect(() => parseTotp(`otpauth://totp/x?secret=${b32}&digits=4`)).toThrow(/cyfr/);
    expect(() => parseTotp(`otpauth://totp/x?secret=${b32}&period=5`)).toThrow(/okres/);
    expect(() => parseTotp("MZXW6")).toThrow(/za krótki/);
  });
});

describe("generator haseł", () => {
  it("randomInt mieści się w zakresie i odrzuca złe argumenty", () => {
    for (let i = 0; i < 1000; i++) {
      const v = randomInt(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
    expect(() => randomInt(0)).toThrow();
    expect(() => randomInt(1.5)).toThrow();
  });

  it("rozkład jest równomierny (test chi-kwadrat)", () => {
    const buckets = new Array(10).fill(0);
    const n = 50_000;
    for (let i = 0; i < n; i++) buckets[randomInt(10)]++;
    const expected = n / 10;
    const chi = buckets.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
    expect(chi).toBeLessThan(27.88); // p = 0.001 dla 9 stopni swobody
  });

  it("zawiera znak z każdej wybranej grupy i ma zadaną długość", () => {
    for (let i = 0; i < 200; i++) {
      const p = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 12 });
      expect(p).toHaveLength(12);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it("respektuje wyłączone grupy, znaki niejednoznaczne i limity długości", () => {
    const p = generatePassword({ length: 64, lowercase: false, uppercase: false, digits: true, symbols: false, avoidAmbiguous: true });
    expect(p).toMatch(/^[2-9]{64}$/);
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 2 })).toHaveLength(8);
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 999 })).toHaveLength(128);
    expect(() => generatePassword({ length: 10, lowercase: false, uppercase: false, digits: false, symbols: false, avoidAmbiguous: false })).toThrow();
  });

  it("frazy hasłowe", () => {
    const p = generatePassphrase(DEFAULT_PASSPHRASE_OPTIONS);
    expect(p.split("-")).toHaveLength(5);
    expect(p).toMatch(/[0-9]/);
    const q = generatePassphrase({ words: 1, separator: " ", capitalize: false, includeNumber: false });
    expect(q.split(" ")).toHaveLength(3);
    expect(q).toMatch(/^[a-z ]+$/);
  });

  it("entropia", () => {
    expect(passwordEntropy({ ...DEFAULT_PASSWORD_OPTIONS, length: 20 })).toBeGreaterThan(120);
    expect(passwordEntropy({ ...DEFAULT_PASSWORD_OPTIONS, lowercase: false, uppercase: false, digits: false, symbols: false })).toBe(0);
    expect(passwordEntropy({ ...DEFAULT_PASSWORD_OPTIONS, avoidAmbiguous: true })).toBeGreaterThan(100);
    expect(passphraseEntropy(DEFAULT_PASSPHRASE_OPTIONS)).toBeGreaterThan(55);
    expect(passphraseEntropy({ ...DEFAULT_PASSPHRASE_OPTIONS, includeNumber: false })).toBe(55);
  });
});

describe("siła haseł i Pwned Passwords", () => {
  it("ocenia słabe i mocne hasła", async () => {
    expect((await evaluatePassword("password")).score).toBeLessThanOrEqual(1);
    expect((await evaluatePassword("qwerty123")).score).toBeLessThanOrEqual(1);
    expect((await evaluatePassword("Tw7#pQ9!vLm2@Xz8&Rk4")).score).toBe(4);
    expect((await evaluatePassword("")).score).toBe(0);
    expect(isWeakScore(0)).toBe(true);
    expect(isWeakScore(1)).toBe(true);
    expect(isWeakScore(2)).toBe(false);
    expect(isWeakScore(null)).toBe(false);
  });

  it("SHA-1 i podział k-anonimowości (wysyłane jest tylko 5 znaków)", async () => {
    const h = await sha1Hex("password");
    expect(h).toBe("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8");
    expect(kAnonymitySplit(h)).toEqual({ prefix: "5BAA6", suffix: "1E4C9B93F3F0682250B6CF8331B7EE68FD8" });
  });

  it("parsuje odpowiedź zakresu", () => {
    const body = "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9659365\r\nFFFF:0";
    expect(findSuffixCount(body, "1E4C9B93F3F0682250B6CF8331B7EE68FD8")).toBe(9659365);
    expect(findSuffixCount(body, "ABC")).toBe(0);
  });

  it("zapytanie do API zawiera wyłącznie prefiks skrótu", async () => {
    clearPwnedCache();
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe("https://api.pwnedpasswords.com/range/5BAA6");
      return new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:42\n");
    });
    expect(await pwnedCount("password", fetchMock as unknown as typeof fetch)).toBe(42);
    // Drugie zapytanie o ten sam prefiks korzysta z pamięci podręcznej.
    expect(await pwnedCount("password", fetchMock as unknown as typeof fetch)).toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.stringify(fetchMock.mock.calls);
    expect(body).not.toContain("1E4C9B93F3F0682250B6CF8331B7EE68FD8");
  });

  it("błąd API jest zgłaszany i nie trafia do pamięci podręcznej", async () => {
    clearPwnedCache();
    const failing = vi.fn(async () => new Response("", { status: 503 }));
    await expect(pwnedCount("abc", failing as unknown as typeof fetch)).rejects.toThrow(/503/);
    const ok = vi.fn(async () => new Response(""));
    expect(await pwnedCount("abc", ok as unknown as typeof fetch)).toBe(0);
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
