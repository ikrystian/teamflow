import { describe, expect, it } from "vitest";
import { redact } from "./logger";
import { scrubEvent } from "./monitoring";

describe("filtrowanie danych w logach i monitoringu", () => {
  it("logger redaguje pola z sekretami i szyfrogramami", () => {
    const out = redact({ password: "tajne", encryptedData: "abc", nested: { authKey: "k", ok: 1 }, note: "x".repeat(600), list: [{ token: "t" }] }) as Record<string, unknown>;
    expect(out.password).toBe("[REDACTED]");
    expect(out.encryptedData).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).authKey).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).ok).toBe(1);
    expect(String(out.note)).toMatch(/600 znaków/);
    expect((out.list as Record<string, unknown>[])[0].token).toBe("[REDACTED]");
  });

  it("zdarzenie Sentry nie zawiera treści żądania, ciasteczek ani danych użytkownika", () => {
    const e = scrubEvent({
      request: { data: '{"password":"x"}', cookies: { dstp: "1" }, headers: { cookie: "a", authorization: "b", "user-agent": "UA" }, query_string: "k=1", url: "https://app/share/1?x=1#k=secret" },
      user: { email: "a@b.pl" },
      extra: { secret: "s", ok: true },
      breadcrumbs: [{}],
    });
    expect(e.request?.data).toBeUndefined();
    expect(e.request?.cookies).toBeUndefined();
    expect(e.request?.headers).toEqual({ "user-agent": "UA" });
    expect(e.request?.url).toBe("https://app/share/1");
    expect(e.user).toBeUndefined();
    expect(e.extra).toEqual({ secret: "[REDACTED]", ok: true });
    expect(e.breadcrumbs).toBeUndefined();
  });
});
