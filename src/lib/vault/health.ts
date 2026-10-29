/**
 * Kondycja haseł (rozdział 4.5). Analiza działa w przeglądarce po odblokowaniu sejfu —
 * serwer zna tylko ocenę siły 0–4 i datę zmiany hasła, nigdy hasło ani jego skrót.
 */
import type { CredentialOverview, CredentialSecrets, CredentialType, Sensitivity } from "./types";
import { primarySecret } from "./types";

export type HealthInput = {
  id: string;
  clientId: string;
  type: CredentialType;
  sensitivity: Sensitivity;
  overview: CredentialOverview | null;
  secrets: CredentialSecrets | null;
  strengthScore: number | null;
  passwordChangedAt: string | null;
  needsRotation: boolean;
};

export type HealthFlag = "weak" | "reused" | "old" | "breached" | "no2fa" | "noUrl" | "noOwner" | "rotation" | "agencyOwned";

export const FLAG_LABELS: Record<HealthFlag, string> = {
  weak: "Słabe hasła",
  reused: "Powtórzone hasła",
  old: "Starsze niż 180 dni",
  breached: "Znalezione w wyciekach",
  no2fa: "Konta bez 2FA",
  noUrl: "Wpisy bez adresu",
  noOwner: "Wpisy bez właściciela konta",
  rotation: "Oznaczone „do zmiany”",
  agencyOwned: "Konta zarejestrowane na agencję",
};

/** Typy, w których brak 2FA jest istotnym ryzykiem. */
const TWO_FACTOR_TYPES: CredentialType[] = ["website", "hosting", "domain", "email", "social", "ads"];
const URL_TYPES: CredentialType[] = ["website", "hosting", "domain", "email", "social", "ads"];

export function analyzeHealth(items: HealthInput[], opts: { maxAgeDays?: number; breached?: Record<string, number>; now?: number } = {}) {
  const maxAge = (opts.maxAgeDays ?? 180) * 86_400_000;
  const now = opts.now ?? Date.now();
  const flags = new Map<string, Set<HealthFlag>>();
  const add = (id: string, f: HealthFlag) => {
    if (!flags.has(id)) flags.set(id, new Set());
    flags.get(id)!.add(f);
  };
  const byPassword = new Map<string, string[]>();
  for (const i of items) {
    if (!i.overview) continue;
    const secret = i.secrets ? primarySecret(i.type, i.secrets) : "";
    const hasSecret = Boolean(secret) || (i.strengthScore != null && !i.secrets);
    if (i.strengthScore != null && i.strengthScore <= 1) add(i.id, "weak");
    if (hasSecret && i.passwordChangedAt && now - new Date(i.passwordChangedAt).getTime() > maxAge) add(i.id, "old");
    if (opts.breached?.[i.id]) add(i.id, "breached");
    if (i.needsRotation) add(i.id, "rotation");
    if (TWO_FACTOR_TYPES.includes(i.type) && !i.overview.hasTotp && i.overview.fields.accessMethod !== "partner") add(i.id, "no2fa");
    if (URL_TYPES.includes(i.type) && !i.overview.url.trim()) add(i.id, "noUrl");
    if (i.type !== "secure_note" && i.overview.accountOwner === "unknown") add(i.id, "noOwner");
    if (i.overview.accountOwner === "agency" && (i.type === "domain" || i.type === "hosting")) add(i.id, "agencyOwned");
    if (secret) {
      const list = byPassword.get(secret) ?? [];
      list.push(i.id);
      byPassword.set(secret, list);
    }
  }
  for (const ids of byPassword.values()) if (ids.length > 1) for (const id of ids) add(id, "reused");

  const lists = Object.fromEntries((Object.keys(FLAG_LABELS) as HealthFlag[]).map((f) => [f, [] as string[]])) as Record<HealthFlag, string[]>;
  for (const [id, fs] of flags) for (const f of fs) lists[f].push(id);
  return { flags, lists, score: healthScore(items, flags) };
}

/**
 * Wskaźnik kondycji 0–100: udział wpisów bez problemów, z wagami — wyciek i słabe/powtórzone
 * hasła ważą najwięcej, braki opisowe najmniej.
 */
const WEIGHTS: Record<HealthFlag, number> = { breached: 1, weak: 0.8, reused: 0.7, rotation: 0.6, old: 0.4, no2fa: 0.3, agencyOwned: 0.2, noUrl: 0.1, noOwner: 0.1 };

export function healthScore(items: HealthInput[], flags: Map<string, Set<HealthFlag>>): number | null {
  const scored = items.filter((i) => i.overview);
  if (!scored.length) return null;
  let penalty = 0;
  for (const i of scored) {
    const fs = flags.get(i.id);
    if (!fs) continue;
    penalty += Math.min(1, [...fs].reduce((s, f) => s + WEIGHTS[f], 0));
  }
  return Math.round(100 * (1 - penalty / scored.length));
}

export function scoreLabel(score: number | null): { label: string; tone: "good" | "ok" | "bad" | "none" } {
  if (score == null) return { label: "brak danych", tone: "none" };
  if (score >= 85) return { label: "dobra", tone: "good" };
  if (score >= 60) return { label: "do poprawy", tone: "ok" };
  return { label: "zła", tone: "bad" };
}
