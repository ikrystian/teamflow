/**
 * Import z CSV (rozdział 4.4): Bitwarden, 1Password, KeePass, przeglądarki — z mapowaniem
 * kolumn i przypisaniem do klientów. Plik jest przetwarzany i szyfrowany w przeglądarce.
 */
import Papa from "papaparse";
import { detectFromUrl } from "./detect";
import { normalize } from "./search";
import { emptyOverview, emptySecrets, type CredentialOverview, type CredentialSecrets, type CredentialType } from "./types";

export type ImportField = "name" | "url" | "login" | "password" | "totp" | "notes" | "tags" | "group";
export const IMPORT_FIELDS: { key: ImportField; label: string }[] = [
  { key: "name", label: "Nazwa" },
  { key: "url", label: "Adres URL" },
  { key: "login", label: "Login" },
  { key: "password", label: "Hasło" },
  { key: "totp", label: "Sekret 2FA" },
  { key: "notes", label: "Notatka" },
  { key: "tags", label: "Tagi" },
  { key: "group", label: "Folder / grupa (→ klient)" },
];

export type ImportSource = "bitwarden" | "1password" | "keepass" | "chrome" | "firefox" | "generic";
export type Mapping = Partial<Record<ImportField, string>>;

const ALIASES: Record<ImportField, string[]> = {
  name: ["name", "title", "nazwa", "tytuł"],
  url: ["login_uri", "url", "website", "uri", "adres", "urls"],
  login: ["login_username", "username", "user name", "login", "email", "użytkownik"],
  password: ["login_password", "password", "hasło", "haslo"],
  totp: ["login_totp", "totp", "otpauth", "one-time password", "otp"],
  notes: ["notes", "note", "notatka", "notatki", "extra"],
  tags: ["tags", "tagi", "labels"],
  group: ["folder", "group", "grupa", "collections", "vault"],
};

export function detectSource(headers: string[]): ImportSource {
  const h = headers.map((x) => x.toLowerCase().trim());
  if (h.includes("login_uri") && h.includes("login_password")) return "bitwarden";
  if (h.includes("httprealm") || h.includes("formactionorigin")) return "firefox";
  if (h.includes("group") && h.includes("title") && h.includes("password")) return "keepass";
  if ((h.includes("otpauth") || h.includes("one-time password")) && h.includes("title")) return "1password";
  if (h.length <= 5 && h.includes("name") && h.includes("url") && h.includes("username") && h.includes("password")) return "chrome";
  return "generic";
}

export function autoMapping(headers: string[]): Mapping {
  const m: Mapping = {};
  for (const f of Object.keys(ALIASES) as ImportField[]) {
    const hit = headers.find((h) => ALIASES[f].includes(h.toLowerCase().trim()));
    if (hit) m[f] = hit;
  }
  return m;
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[]; errors: string[] } {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  return {
    headers: res.meta.fields ?? [],
    rows: res.data.filter((r) => Object.values(r).some((v) => v && String(v).trim())),
    errors: res.errors.slice(0, 5).map((e) => `Wiersz ${(e.row ?? 0) + 2}: ${e.message}`),
  };
}

export type ImportRow = {
  index: number;
  type: CredentialType;
  group: string;
  overview: CredentialOverview;
  secrets: CredentialSecrets;
};

/** Zamienia wiersze CSV na szkice wpisów (typ wykrywany z adresu). */
export function rowsToDrafts(rows: Record<string, string>[], mapping: Mapping): ImportRow[] {
  const get = (r: Record<string, string>, f: ImportField) => (mapping[f] ? String(r[mapping[f]!] ?? "").trim() : "");
  return rows
    .map((r, index) => {
      const url = get(r, "url").split(/[\s,]+/)[0] ?? "";
      const login = get(r, "login");
      const password = get(r, "password");
      const notes = get(r, "notes");
      // Bitwarden: typ 2 = bezpieczna notatka.
      const isNote = (r.type === "note" || r.type === "2") && !password;
      const det = url ? detectFromUrl(url) : null;
      const type: CredentialType = isNote ? "secure_note" : (det?.type ?? (url ? "website" : "other"));
      const overview = emptyOverview(type);
      const secrets = emptySecrets(type);
      overview.name = get(r, "name") || det?.name || (url ? url.replace(/^https?:\/\//, "").split("/")[0] : `Import ${index + 1}`);
      overview.url = url && /^[a-z]+:\/\//i.test(url) ? url : url ? `https://${url}` : "";
      overview.login = login;
      overview.tags = [...new Set(["import", ...get(r, "tags").split(/[,;]/).map((t) => t.trim()).filter(Boolean)])];
      overview.accountOwner = "unknown";
      if (det) for (const [k, v] of Object.entries(det.fields)) if (v && k in overview.fields) overview.fields[k] = v;
      if (type === "secure_note") secrets.fields.content = notes;
      else overview.notes = notes;
      secrets.password = type === "secure_note" ? "" : password;
      secrets.totp = get(r, "totp");
      return { index, type, group: get(r, "group"), overview, secrets };
    })
    .filter((d) => d.overview.name || d.secrets.password || d.overview.login);
}

/** Dopasowanie folderu/grupy do istniejącego klienta (bez wielkości liter i ogonków). */
export function matchClient(group: string, clients: { id: string; name: string }[]): string | null {
  const n = (s: string) => normalize(s).trim();
  const g = n(group.split("/").pop() ?? group);
  if (!g) return null;
  return clients.find((c) => n(c.name) === g)?.id ?? null;
}

// --- Eksport -------------------------------------------------------------------------

export type ExportRow = { client: string; type: string; sensitivity: string; overview: CredentialOverview | null; secrets: CredentialSecrets };

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** CSV zgodny z importem Bitwardena (folder = klient). */
export function toCsv(rows: ExportRow[]): string {
  const header = ["folder", "type", "name", "notes", "login_uri", "login_username", "login_password", "login_totp", "sensitivity", "tags"];
  const lines = rows
    .filter((r) => r.overview)
    .map((r) => {
      const o = r.overview!;
      const notes = [o.notes, r.secrets.fields.content, ...Object.entries(o.fields).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), ...Object.entries(r.secrets.fields).filter(([k, v]) => v && k !== "content").map(([k, v]) => `${k}: ${v}`)]
        .filter(Boolean)
        .join("\n");
      return [r.client, r.type === "secure_note" ? "note" : "login", o.name, notes, o.url, o.login, r.secrets.password, r.secrets.totp, r.sensitivity, o.tags.join(",")].map(csvCell).join(",");
    });
  return [header.join(","), ...lines].join("\r\n");
}
