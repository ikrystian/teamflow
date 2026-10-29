import "server-only";
import { headers } from "next/headers";

export type RequestMeta = { ip: string | null; userAgent: string | null; country: string | null };

export function metaFromHeaders(h: Headers): RequestMeta {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || h.get("cf-connecting-ip") || null;
  const country = h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || h.get("x-country") || null;
  return {
    ip: ip ? ip.slice(0, 64) : null,
    userAgent: h.get("user-agent")?.slice(0, 400) ?? null,
    country: country && /^[A-Z]{2}$/i.test(country) ? country.toUpperCase() : null,
  };
}

export async function requestMeta(): Promise<RequestMeta> {
  try {
    return metaFromHeaders(await headers());
  } catch {
    return { ip: null, userAgent: null, country: null };
  }
}

/** Krótki opis urządzenia z User-Agent (do listy sesji i e-maili). */
export function describeDevice(ua: string | null | undefined): string {
  if (!ua) return "Nieznane urządzenie";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Przeglądarka";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "inny system";
  return `${browser} · ${os}`;
}
