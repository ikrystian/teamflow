import { env, securityContact } from "@/lib/env";

/** RFC 9116 — proces zgłaszania podatności (rozdział 6.5). */
export function GET() {
  const expires = new Date(Date.now() + 180 * 86_400_000).toISOString();
  const body = [
    `Contact: mailto:${securityContact}`,
    `Expires: ${expires}`,
    "Preferred-Languages: pl, en",
    `Policy: ${new URL("/legal/security", env.APP_URL)}`,
    `Canonical: ${new URL("/.well-known/security.txt", env.APP_URL)}`,
  ].join("\n");
  return new Response(`${body}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
