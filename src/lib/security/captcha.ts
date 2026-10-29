/**
 * CAPTCHA typu proof-of-work (bez skryptów firm trzecich, rozdział 6.4).
 * Serwer wydaje podpisane HMAC wyzwanie; przeglądarka szuka liczby `n`, dla której
 * SHA-256(salt + n) zaczyna się od `difficulty` zerowych bitów. Rozwiązanie jest jednorazowe.
 */
export type CaptchaChallenge = { salt: string; difficulty: number; expiresAt: number; signature: string };
export type CaptchaSolution = CaptchaChallenge & { nonce: number };

const enc = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function leadingZeroBits(bytes: Uint8Array): number {
  let bits = 0;
  for (const b of bytes) {
    if (b === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(b) - 24;
    break;
  }
  return bits;
}

export async function powHash(salt: string, nonce: number): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`${salt}:${nonce}`)));
}

export async function createChallenge(secret: string, difficulty = 18, ttlMs = 5 * 60_000): Promise<CaptchaChallenge> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const expiresAt = Date.now() + ttlMs;
  return { salt, difficulty, expiresAt, signature: await hmac(secret, `${salt}.${difficulty}.${expiresAt}`) };
}

export async function verifySolution(secret: string, s: CaptchaSolution, now = Date.now()): Promise<boolean> {
  if (!s || typeof s.nonce !== "number" || !Number.isInteger(s.nonce) || s.nonce < 0) return false;
  if (s.expiresAt < now) return false;
  const expected = await hmac(secret, `${s.salt}.${s.difficulty}.${s.expiresAt}`);
  if (expected.length !== s.signature?.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ s.signature.charCodeAt(i);
  if (diff !== 0) return false;
  return leadingZeroBits(await powHash(s.salt, s.nonce)) >= s.difficulty;
}

/** Przeglądarka: rozwiązuje wyzwanie (średnio 2^difficulty prób). */
export async function solveChallenge(c: CaptchaChallenge, onProgress?: (n: number) => void): Promise<CaptchaSolution> {
  for (let nonce = 0; ; nonce++) {
    if (leadingZeroBits(await powHash(c.salt, nonce)) >= c.difficulty) return { ...c, nonce };
    if (onProgress && nonce % 5000 === 0) onProgress(nonce);
  }
}
