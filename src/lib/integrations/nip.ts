import "server-only";
import { isValidNip, normalizeNip } from "@/lib/validation";

export type CompanyLookup = { name: string; nip: string; regon: string | null; address: { street?: string; postalCode?: string; city?: string; country?: string }; vatStatus: string | null };

/**
 * Autouzupełnianie danych firmy po NIP z publicznego wykazu podatników VAT
 * (Biała lista, API Ministerstwa Finansów — bez klucza).
 */
export async function lookupNip(input: string): Promise<CompanyLookup | null> {
  const nip = normalizeNip(input);
  if (!isValidNip(nip)) throw new Error("Nieprawidłowy NIP");
  const date = new Date().toISOString().slice(0, 10);
  const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${date}`, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Wykaz podatników VAT: HTTP ${res.status}`);
  const json = (await res.json()) as { result?: { subject?: { name?: string; nip?: string; regon?: string; workingAddress?: string | null; residenceAddress?: string | null; statusVat?: string } | null } };
  const s = json.result?.subject;
  if (!s?.name) return null;
  return { name: s.name, nip, regon: s.regon ?? null, address: parseAddress(s.workingAddress ?? s.residenceAddress ?? ""), vatStatus: s.statusVat ?? null };
}

/** „UL. PROSTA 1, 00-001 WARSZAWA” → części adresu. */
export function parseAddress(raw: string) {
  const m = raw.match(/^(.*?),\s*(\d{2}-\d{3})\s+(.+)$/);
  if (!m) return raw ? { street: raw, country: "Polska" } : {};
  return { street: m[1].trim(), postalCode: m[2], city: m[3].trim(), country: "Polska" };
}
