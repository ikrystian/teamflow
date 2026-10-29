import { describe, expect, it } from "vitest";
import { analyzeHealth, scoreLabel, type HealthInput } from "./health";
import { emptyOverview, emptySecrets } from "./types";

const now = new Date("2026-10-28T12:00:00Z").getTime();

function item(id: string, patch: Partial<HealthInput> & { password?: string; url?: string; totp?: boolean } = {}): HealthInput {
  const overview = { ...emptyOverview(patch.type ?? "website"), url: patch.url ?? "https://x.pl", hasTotp: patch.totp ?? true };
  const secrets = { ...emptySecrets(patch.type ?? "website"), password: patch.password ?? `unique-${id}` };
  return {
    id,
    clientId: "c1",
    type: "website",
    sensitivity: "standard",
    overview,
    secrets,
    strengthScore: 4,
    passwordChangedAt: new Date(now - 10 * 86_400_000).toISOString(),
    needsRotation: false,
    ...patch,
  };
}

describe("kondycja haseł", () => {
  it("wykrywa słabe, powtórzone, stare, z wycieku, bez 2FA, bez adresu i właściciela", () => {
    const items = [
      item("weak", { strengthScore: 1 }),
      item("r1", { password: "same" }),
      item("r2", { password: "same" }),
      item("old", { passwordChangedAt: new Date(now - 200 * 86_400_000).toISOString() }),
      item("leak"),
      item("no2fa", { totp: false }),
      item("nourl", { url: "" }),
      { ...item("noowner"), overview: { ...item("noowner").overview!, accountOwner: "unknown" as const } },
      item("rot", { needsRotation: true }),
    ];
    const { lists } = analyzeHealth(items, { now, breached: { leak: 3 } });
    expect(lists.weak).toEqual(["weak"]);
    expect(lists.reused.sort()).toEqual(["r1", "r2"]);
    expect(lists.old).toEqual(["old"]);
    expect(lists.breached).toEqual(["leak"]);
    expect(lists.no2fa).toEqual(["no2fa"]);
    expect(lists.noUrl).toEqual(["nourl"]);
    expect(lists.noOwner).toEqual(["noowner"]);
    expect(lists.rotation).toEqual(["rot"]);
  });

  it("dostęp partnerski nie wymaga 2FA, domena na agencji jest oznaczana", () => {
    const ads = item("ads", { type: "ads", totp: false });
    ads.overview!.fields.accessMethod = "partner";
    const domain = item("dom", { type: "domain" });
    domain.overview!.accountOwner = "agency";
    const { lists } = analyzeHealth([ads, domain], { now });
    expect(lists.no2fa).toEqual([]);
    expect(lists.agencyOwned).toEqual(["dom"]);
  });

  it("wpis krytyczny bez odsłoniętych sekretów nie jest liczony do powtórzeń, ale ocenę siły zna serwer", () => {
    const crit = { ...item("crit", { strengthScore: 0 }), secrets: null, sensitivity: "critical" as const };
    const { lists } = analyzeHealth([crit, item("x", { password: "a" })], { now });
    expect(lists.weak).toEqual(["crit"]);
    expect(lists.reused).toEqual([]);
  });

  it("wskaźnik 0–100 i etykiety", () => {
    expect(analyzeHealth([item("a"), item("b")], { now }).score).toBe(100);
    expect(analyzeHealth([item("a", { strengthScore: 0 })], { now, breached: { a: 1 } }).score).toBe(0);
    expect(analyzeHealth([], { now }).score).toBeNull();
    expect(scoreLabel(90).tone).toBe("good");
    expect(scoreLabel(70).tone).toBe("ok");
    expect(scoreLabel(10).tone).toBe("bad");
    expect(scoreLabel(null).tone).toBe("none");
  });
});
