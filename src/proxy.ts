import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next.js 16, dawniej middleware):
 * 1. nagłówki bezpieczeństwa i restrykcyjna CSP z nonce (sejf odszyfrowuje dane w przeglądarce,
 *    więc XSS jest zagrożeniem numer jeden),
 * 2. WYŁĄCZNIE szybkie przekierowanie niezalogowanych (po obecności ciasteczka sesji).
 * Autoryzacja odbywa się w warstwie danych i w każdym Route Handlerze — lekcja z CVE-2025-29927.
 */
const PUBLIC_PREFIXES = ["/auth/", "/share/", "/request/", "/invite/", "/legal", "/public/", "/uploads/", "/api/", "/.well-known/"];
const SESSION_COOKIES = ["nexus.session_token", "__Secure-nexus.session_token"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    // 'wasm-unsafe-eval' — libsodium (Argon2id) działa w WebAssembly.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    // Style inline wstrzykują biblioteki UI (Radix, sonner, TipTap, Recharts); skrypty pozostają chronione nonce.
    "style-src 'self' 'unsafe-inline'",
    // Obrazy projektów (Pexels/Unsplash) i opcjonalne ikony serwisów w sejfie.
    "img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com https://icons.duckduckgo.com",
    "font-src 'self'",
    // Pwned Passwords (k-anonimowość) — jedyne zewnętrzne zapytanie z przeglądarki.
    `connect-src 'self' https://api.pwnedpasswords.com${isDev ? " ws: wss:" : ""}`,
    // Service worker powiadomień push (public/sw.js).
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  // Powrót na bieżącą stronę po konfiguracji sejfu lub odblokowaniu (lib/dal/session.ts).
  requestHeaders.set("x-pathname", pathname + request.nextUrl.search);

  const isPublic = pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const hasSession = SESSION_COOKIES.some((c) => request.cookies.has(c));

  let response: NextResponse;
  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.search = pathname !== "/dashboard" ? `?next=${encodeURIComponent(pathname + request.nextUrl.search)}` : "";
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  // Załączniki i publiczne strony zadań (podgląd linków w Slacku) mogą być osadzane gdzie indziej.
  if (!pathname.startsWith("/uploads/") && !pathname.startsWith("/public/")) response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(self), clipboard-write=(self), publickey-credentials-get=(self), publickey-credentials-create=(self)",
  );
  if (!pathname.startsWith("/_next/static") && !pathname.startsWith("/uploads/")) response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icon-192.png|badge-96.png|sw.js|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
