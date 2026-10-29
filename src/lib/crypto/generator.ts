/**
 * Generator haseł i fraz hasłowych (rozdział 4.4). Losowość z crypto.getRandomValues,
 * losowanie bez obciążenia rozkładu (rejection sampling).
 */
import { wordlist } from "@scure/bip39/wordlists/english.js";

export type PasswordOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  /** Pomija znaki łatwe do pomylenia: Il1O0 */
  avoidAmbiguous: boolean;
};

export type PassphraseOptions = {
  words: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
};

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
};

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = { words: 5, separator: "-", capitalize: true, includeNumber: true };

const SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/~",
};
const AMBIGUOUS = /[Il1O0o]/g;

/** Losowa liczba całkowita z [0, max) bez obciążenia. */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new Error("Nieprawidłowy zakres");
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export function generatePassword(opts: PasswordOptions): string {
  const length = Math.min(Math.max(Math.trunc(opts.length), 8), 128);
  const groups = (Object.keys(SETS) as (keyof typeof SETS)[])
    .filter((k) => opts[k])
    .map((k) => (opts.avoidAmbiguous ? SETS[k].replace(AMBIGUOUS, "") : SETS[k]));
  if (groups.length === 0) throw new Error("Wybierz co najmniej jeden rodzaj znaków");
  const all = groups.join("");
  // Gwarantuje co najmniej jeden znak z każdej wybranej grupy.
  const chars = groups.map((g) => g[randomInt(g.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function generatePassphrase(opts: PassphraseOptions): string {
  const count = Math.min(Math.max(Math.trunc(opts.words), 3), 12);
  const words = Array.from({ length: count }, () => {
    const w = wordlist[randomInt(wordlist.length)];
    return opts.capitalize ? w[0].toUpperCase() + w.slice(1) : w;
  });
  if (opts.includeNumber) {
    const idx = randomInt(words.length);
    words[idx] = words[idx] + randomInt(10);
  }
  return words.join(opts.separator);
}

/** Entropia w bitach (dla UI generatora). */
export function passwordEntropy(opts: PasswordOptions): number {
  const pool = (Object.keys(SETS) as (keyof typeof SETS)[])
    .filter((k) => opts[k])
    .reduce((n, k) => n + (opts.avoidAmbiguous ? SETS[k].replace(AMBIGUOUS, "") : SETS[k]).length, 0);
  return pool ? Math.round(opts.length * Math.log2(pool)) : 0;
}

export function passphraseEntropy(opts: PassphraseOptions): number {
  return Math.round(opts.words * Math.log2(wordlist.length) + (opts.includeNumber ? Math.log2(10 * opts.words) : 0));
}
