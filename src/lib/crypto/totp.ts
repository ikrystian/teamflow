/**
 * TOTP (RFC 6238) liczony w przeglądarce z sekretu 2FA zapisanego w sejfie.
 * HMAC przez Web Crypto API. Obsługuje sekrety base32 i adresy otpauth://.
 */
import { base32Decode } from "./encoding";

export type TotpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";
export type TotpConfig = { secret: Uint8Array; algorithm: TotpAlgorithm; digits: number; period: number; issuer?: string; account?: string };

const ALGORITHMS: Record<string, TotpAlgorithm> = { SHA1: "SHA-1", SHA256: "SHA-256", SHA512: "SHA-512" };

/** Przyjmuje sekret base32 lub adres otpauth://totp/... */
export function parseTotp(input: string): TotpConfig {
  const value = input.trim();
  if (value.toLowerCase().startsWith("otpauth://")) {
    const url = new URL(value);
    if (url.host.toLowerCase() !== "totp") throw new Error("Obsługiwane są tylko kody TOTP");
    const secret = url.searchParams.get("secret");
    if (!secret) throw new Error("Adres otpauth nie zawiera sekretu");
    const algorithm = ALGORITHMS[(url.searchParams.get("algorithm") ?? "SHA1").toUpperCase()];
    if (!algorithm) throw new Error("Nieobsługiwany algorytm TOTP");
    const digits = Number(url.searchParams.get("digits") ?? 6);
    const period = Number(url.searchParams.get("period") ?? 30);
    if (![6, 7, 8].includes(digits)) throw new Error("Nieobsługiwana liczba cyfr");
    if (!(period >= 10 && period <= 300)) throw new Error("Nieobsługiwany okres");
    const label = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const [issuerFromLabel, account] = label.includes(":") ? label.split(":", 2) : [undefined, label];
    return {
      secret: base32Decode(secret),
      algorithm,
      digits,
      period,
      issuer: url.searchParams.get("issuer") ?? issuerFromLabel,
      account,
    };
  }
  const secret = base32Decode(value);
  if (secret.length < 10) throw new Error("Sekret 2FA jest za krótki");
  return { secret, algorithm: "SHA-1", digits: 6, period: 30 };
}

export function isValidTotpInput(input: string): boolean {
  try {
    parseTotp(input);
    return true;
  } catch {
    return false;
  }
}

export async function hotp(secret: Uint8Array, counter: number, digits = 6, algorithm: TotpAlgorithm = "SHA-1"): Promise<string> {
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const key = await crypto.subtle.importKey("raw", secret as BufferSource, { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return (bin % 10 ** digits).toString().padStart(digits, "0");
}

export async function totp(config: TotpConfig, timeMs = Date.now()): Promise<{ code: string; remaining: number; period: number }> {
  const step = Math.floor(timeMs / 1000 / config.period);
  const code = await hotp(config.secret, step, config.digits, config.algorithm);
  const remaining = config.period - (Math.floor(timeMs / 1000) % config.period);
  return { code, remaining, period: config.period };
}
