import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("libsodium-wrappers-sumo");
});

describe("inicjalizacja libsodium", () => {
  it("sodiumSync rzuca wyjątek przed inicjalizacją", async () => {
    vi.doMock("libsodium-wrappers-sumo", () => ({ default: { ready: Promise.resolve() } }));
    const { sodiumSync } = await import("./sodium");
    expect(() => sodiumSync()).toThrow(/zainicjalizowany/);
  });

  it("wipe ma zapasową ścieżkę, gdy memzero zawiedzie", async () => {
    vi.doMock("libsodium-wrappers-sumo", () => ({
      default: {
        ready: Promise.resolve(),
        memzero: () => {
          throw new Error("brak");
        },
      },
    }));
    const { wipe } = await import("./sodium");
    const b = new Uint8Array([1, 2, 3]);
    wipe(b);
    expect([...b]).toEqual([0, 0, 0]);
  });

  it("verifyAuthKey zwraca false, gdy weryfikacja rzuci wyjątek", async () => {
    const { verifyAuthKey } = await import("./master");
    expect(await verifyAuthKey(undefined as unknown as string, "x")).toBe(false);
  });
});
