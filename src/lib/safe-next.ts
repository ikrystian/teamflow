/** Chroni przed otwartym przekierowaniem: dopuszcza tylko ścieżki względne w aplikacji. */
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  if (/^\/auth\/(signin|signup|unlock)(\/|$|\?)/.test(v)) return fallback;
  return v;
}
