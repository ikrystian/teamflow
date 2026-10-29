/** Formatowanie dat i czasu po polsku. */
const rtf = new Intl.RelativeTimeFormat("pl", { numeric: "auto" });

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date).getTime();
  const diff = d - Date.now();
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 86_400_000],
    ["month", 30 * 86_400_000],
    ["week", 7 * 86_400_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  return "przed chwilą";
}

/** „3 mies. temu” — krótka forma do wierszy listy. */
export function formatAgoShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days < 1) return "dziś";
  if (days < 30) return `${days} dn. temu`;
  if (days < 365) return `${Math.floor(days / 30)} mies. temu`;
  return `${Math.floor(days / 365)} l. temu`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("pl-PL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function daysUntil(date: string | Date): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

/** „Anna Kowalska” → „Anna K.” */
export function shortName(name: string | null | undefined): string {
  if (!name) return "—";
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Wiek sesji w milisekundach. */
export function sessionAgeMs(createdAt: string | Date): number {
  return Date.now() - new Date(createdAt).getTime();
}
