/**
 * Ocena siły haseł (zxcvbn-ts) i sprawdzanie wycieków w Pwned Passwords metodą
 * k-anonimowości (rozdział 4.4): do usługi trafia tylko 5 pierwszych znaków skrótu SHA-1.
 */
import type { ZxcvbnFactory, ZxcvbnResult } from "@zxcvbn-ts/core";
import { toHex } from "./encoding";

let factoryPromise: Promise<ZxcvbnFactory> | null = null;

/** Słowniki ładowane leniwie (kilkaset KB) dopiero przy pierwszej ocenie. */
function getFactory(): Promise<ZxcvbnFactory> {
  if (!factoryPromise) {
    factoryPromise = (async () => {
      const [core, common, en, pl] = await Promise.all([
        import("@zxcvbn-ts/core"),
        import("@zxcvbn-ts/language-common"),
        import("@zxcvbn-ts/language-en"),
        import("@zxcvbn-ts/language-pl"),
      ]);
      return new core.ZxcvbnFactory({
        translations: pl.translations,
        graphs: common.adjacencyGraphs,
        dictionary: { ...common.dictionary, ...en.dictionary, ...pl.dictionary },
        useLevenshteinDistance: true,
      });
    })();
  }
  return factoryPromise;
}

export type StrengthResult = {
  score: 0 | 1 | 2 | 3 | 4;
  warning: string | null;
  suggestions: string[];
  crackTime: string;
};

export async function evaluatePassword(password: string, userInputs: string[] = []): Promise<StrengthResult> {
  if (!password) return { score: 0, warning: null, suggestions: [], crackTime: "" };
  const factory = await getFactory();
  const r: ZxcvbnResult = await factory.checkAsync(password, userInputs.filter(Boolean));
  return {
    score: r.score as StrengthResult["score"],
    warning: r.feedback.warning ?? null,
    suggestions: r.feedback.suggestions ?? [],
    crackTime: String(r.crackTimes?.offlineSlowHashingXPerSecond?.display ?? ""),
  };
}

export const STRENGTH_LABELS = ["bardzo słabe", "słabe", "przeciętne", "dobre", "bardzo dobre"] as const;
export const WEAK_SCORE_THRESHOLD = 2;
export const isWeakScore = (score: number | null | undefined) => score != null && score <= WEAK_SCORE_THRESHOLD - 1;

// --- Pwned Passwords ----------------------------------------------------------

export async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest)).toUpperCase();
}

/** Dzieli skrót na część wysyłaną (5 znaków) i część porównywaną lokalnie. */
export function kAnonymitySplit(hashHex: string) {
  return { prefix: hashHex.slice(0, 5), suffix: hashHex.slice(5) };
}

/** Parsuje odpowiedź API zakresu i zwraca liczbę wystąpień danego sufiksu. */
export function findSuffixCount(rangeBody: string, suffix: string): number {
  for (const line of rangeBody.split(/\r?\n/)) {
    const [s, count] = line.trim().split(":");
    if (s && s.toUpperCase() === suffix) return Number(count) || 0;
  }
  return 0;
}

const rangeCache = new Map<string, Promise<string>>();

export async function pwnedCount(password: string, fetchImpl: typeof fetch = fetch): Promise<number> {
  const { prefix, suffix } = kAnonymitySplit(await sha1Hex(password));
  let body = rangeCache.get(prefix);
  if (!body) {
    body = fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      referrerPolicy: "no-referrer",
      credentials: "omit",
      cache: "no-store",
    }).then((r) => {
      if (!r.ok) throw new Error(`Pwned Passwords: HTTP ${r.status}`);
      return r.text();
    });
    rangeCache.set(prefix, body);
    body.catch(() => rangeCache.delete(prefix));
  }
  return findSuffixCount(await body, suffix);
}

export function clearPwnedCache() {
  rangeCache.clear();
}
