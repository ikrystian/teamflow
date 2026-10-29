/**
 * Wklejony adres podpowiada typ i nazwę (rozdział 5.5, krok 3),
 * np. adres z „/wp-admin” to WordPress.
 */
import { DEFAULT_PORTS, type CredentialType } from "./types";

export type Detection = {
  type: CredentialType;
  name: string;
  fields: Record<string, string>;
  login?: string;
  url?: string;
};

type Rule = { test: (u: URL, raw: string) => boolean; detect: (u: URL) => Omit<Detection, "url"> };

const host = (u: URL) => u.hostname.replace(/^www\./, "");
const path = (u: URL) => u.pathname.toLowerCase();

const RULES: Rule[] = [
  // Protokoły połączeń
  {
    test: (u) => ["ftp:", "sftp:", "ftps:"].includes(u.protocol),
    detect: (u) => {
      const protocol = u.protocol.replace(":", "");
      return {
        type: "ftp",
        name: `${protocol.toUpperCase()} — ${u.hostname}`,
        login: decodeURIComponent(u.username),
        fields: { protocol, host: u.hostname, port: u.port || DEFAULT_PORTS[protocol], rootDir: u.pathname !== "/" ? u.pathname : "" },
      };
    },
  },
  {
    test: (u) => u.protocol === "ssh:",
    detect: (u) => ({ type: "ssh", name: `SSH — ${u.hostname}`, login: decodeURIComponent(u.username), fields: { host: u.hostname, port: u.port || "22" } }),
  },
  {
    test: (u) => ["mysql:", "mariadb:", "postgres:", "postgresql:", "mongodb:", "mongodb+srv:", "sqlserver:"].includes(u.protocol),
    detect: (u) => {
      const proto = u.protocol.replace(":", "");
      const engine = { postgres: "postgresql", "mongodb+srv": "mongodb", sqlserver: "mssql" }[proto] ?? proto;
      return {
        type: "database",
        name: `Baza ${u.pathname.replace("/", "") || u.hostname}`,
        login: decodeURIComponent(u.username),
        fields: { engine, host: u.hostname, port: u.port || DEFAULT_PORTS[engine] || "", databaseName: u.pathname.replace(/^\//, "") },
      };
    },
  },
  // CMS
  {
    test: (u) => /\/wp-(admin|login\.php)/.test(path(u)),
    detect: () => ({ type: "website", name: "WordPress — panel admina", fields: { cms: "WordPress", accountRole: "Administrator" } }),
  },
  {
    test: (u) => host(u).endsWith("myshopify.com") || host(u) === "admin.shopify.com",
    detect: () => ({ type: "website", name: "Shopify — panel sklepu", fields: { cms: "Shopify" } }),
  },
  {
    test: (u) => /^\/administrator(\/|$)/.test(path(u)),
    detect: () => ({ type: "website", name: "Joomla — panel admina", fields: { cms: "Joomla" } }),
  },
  {
    test: (u) => /\/(admin[a-z0-9]*\/index\.php|admin-dev)/.test(path(u)) && /controller=|token=/.test(u.search + path(u)),
    detect: () => ({ type: "website", name: "PrestaShop — panel sklepu", fields: { cms: "PrestaShop" } }),
  },
  {
    test: (u) => /\/user\/login/.test(path(u)),
    detect: () => ({ type: "website", name: "Drupal — panel admina", fields: { cms: "Drupal" } }),
  },
  // Panele hostingu
  {
    test: (u) => ["2082", "2083"].includes(u.port) || /(^|\.)cpanel\./.test(u.hostname) || path(u).includes("/cpanel"),
    detect: (u) => ({ type: "hosting", name: `cPanel — ${host(u)}`, fields: { panel: "cPanel" } }),
  },
  {
    test: (u) => u.port === "2222" || /directadmin/.test(u.hostname),
    detect: (u) => ({ type: "hosting", name: `DirectAdmin — ${host(u)}`, fields: { panel: "DirectAdmin" } }),
  },
  {
    test: (u) => u.port === "8443" || /plesk/.test(u.hostname),
    detect: (u) => ({ type: "hosting", name: `Plesk — ${host(u)}`, fields: { panel: "Plesk" } }),
  },
  // Bazy danych przez przeglądarkę
  {
    test: (u) => /phpmyadmin|adminer/.test(u.hostname + path(u)),
    detect: (u) => ({ type: "database", name: `Baza danych — ${host(u)}`, fields: { engine: "mysql", port: "3306" } }),
  },
  // Google
  {
    test: (u) => host(u) === "ads.google.com",
    detect: () => ({ type: "ads", name: "Google Ads", fields: { platform: "Google Ads", accessMethod: "partner" } }),
  },
  {
    test: (u) => host(u) === "analytics.google.com",
    detect: () => ({ type: "ads", name: "Google Analytics", fields: { platform: "Google Analytics", accessMethod: "partner" } }),
  },
  {
    test: (u) => host(u) === "search.google.com" && path(u).includes("search-console"),
    detect: () => ({ type: "ads", name: "Google Search Console", fields: { platform: "Google Search Console", accessMethod: "partner" } }),
  },
  {
    test: (u) => host(u) === "tagmanager.google.com",
    detect: () => ({ type: "ads", name: "Google Tag Manager", fields: { platform: "Google Tag Manager", accessMethod: "partner" } }),
  },
  {
    test: (u) => host(u) === "merchants.google.com",
    detect: () => ({ type: "ads", name: "Google Merchant Center", fields: { platform: "Google Merchant Center", accessMethod: "partner" } }),
  },
  {
    test: (u) => host(u) === "mail.google.com",
    detect: () => ({ type: "email", name: "Gmail / Google Workspace", fields: { provider: "Google Workspace" } }),
  },
  // Meta
  {
    test: (u) => (host(u) === "business.facebook.com" || host(u) === "adsmanager.facebook.com") && /adsmanager|ads/.test(path(u) + u.hostname),
    detect: () => ({ type: "ads", name: "Meta Ads", fields: { platform: "Meta Ads", accessMethod: "partner" } }),
  },
  {
    test: (u) => /(^|\.)facebook\.com$/.test(u.hostname),
    detect: () => ({ type: "social", name: "Facebook", fields: { platform: "Facebook" } }),
  },
  {
    test: (u) => /(^|\.)instagram\.com$/.test(u.hostname),
    detect: () => ({ type: "social", name: "Instagram", fields: { platform: "Instagram" } }),
  },
  {
    test: (u) => /(^|\.)linkedin\.com$/.test(u.hostname),
    detect: () => ({ type: "social", name: "LinkedIn", fields: { platform: "LinkedIn" } }),
  },
  {
    test: (u) => /(^|\.)tiktok\.com$/.test(u.hostname),
    detect: (u) => (u.hostname.startsWith("ads.") ? { type: "ads", name: "TikTok Ads", fields: { platform: "TikTok Ads" } } : { type: "social", name: "TikTok", fields: { platform: "TikTok" } }),
  },
  {
    test: (u) => /(^|\.)(youtube\.com|studio\.youtube\.com)$/.test(u.hostname),
    detect: () => ({ type: "social", name: "YouTube", fields: { platform: "YouTube" } }),
  },
  {
    test: (u) => /(^|\.)(x\.com|twitter\.com)$/.test(u.hostname),
    detect: () => ({ type: "social", name: "X", fields: { platform: "X" } }),
  },
  {
    test: (u) => /(^|\.)pinterest\.[a-z.]+$/.test(u.hostname),
    detect: () => ({ type: "social", name: "Pinterest", fields: { platform: "Pinterest" } }),
  },
  // Poczta
  {
    test: (u) => /outlook\.(office|office365|live)\.com$/.test(u.hostname),
    detect: () => ({ type: "email", name: "Microsoft 365 — poczta", fields: { provider: "Microsoft 365" } }),
  },
  {
    test: (u) => /^(webmail|poczta|mail|roundcube)\./.test(u.hostname) || /roundcube|webmail|horde|rainloop|snappymail/.test(path(u)),
    detect: (u) => ({ type: "email", name: `Poczta — ${host(u).replace(/^(webmail|poczta|mail)\./, "")}`, fields: { provider: "Skrzynka na hostingu" } }),
  },
  // Domeny / DNS
  {
    test: (u) => host(u) === "dash.cloudflare.com",
    detect: () => ({ type: "domain", name: "Cloudflare — DNS", fields: { registrar: "Cloudflare" } }),
  },
  {
    test: (u) => /(^|\.)(dns\.pl|domeny\.pl|aftermarket\.pl|namecheap\.com|godaddy\.com|porkbun\.com|gandi\.net)$/.test(u.hostname),
    detect: (u) => ({ type: "domain", name: `Domeny — ${host(u)}`, fields: { registrar: host(u) } }),
  },
  // Klucze API / bramki płatności
  {
    test: (u) => /(^|\.)(dashboard\.stripe\.com|panel\.przelewy24\.pl|secure\.payu\.com|merchant\.payu\.com|developers\.inpost\.pl)$/.test(u.hostname),
    detect: (u) => ({ type: "api", name: `API — ${host(u)}`, fields: { service: host(u).split(".").slice(-2, -1)[0] ?? host(u) } }),
  },
];

/** Zwraca podpowiedź typu na podstawie wklejonego adresu (lub null, gdy brak dopasowania). */
export function detectFromUrl(input: string): Detection | null {
  const raw = input.trim();
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!u.hostname || !u.hostname.includes(".") && u.hostname !== "localhost") return null;
  for (const rule of RULES) {
    if (rule.test(u, raw)) {
      const d = rule.detect(u);
      const isWeb = u.protocol === "http:" || u.protocol === "https:";
      return { ...d, login: d.login || undefined, url: isWeb ? u.toString() : undefined };
    }
  }
  return null;
}
