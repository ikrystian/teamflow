import { describe, expect, it } from "vitest";
import { buildIndex, normalize, searchIndex } from "./search";

describe("wyszukiwanie w pamięci przeglądarki", () => {
  it("normalizuje polskie znaki i wielkość liter", () => {
    expect(normalize("Łódź ŻÓŁW")).toBe("lodz zolw");
  });

  it("dopasowuje wszystkie słowa i preferuje trafienia w nazwie", () => {
    const index = buildIndex([
      { id: "1", name: "WordPress — panel admina", clientName: "Piekarnia Łódź", url: "https://piekarnia.pl/wp-admin", login: "admin", tags: ["www"] },
      { id: "2", name: "FTP", clientName: "Piekarnia Łódź", url: "", login: "ftp-wordpress", tags: [] },
      { id: "3", name: "Facebook", clientName: "Kwiaciarnia", url: "https://facebook.com", login: "kwiaty@x.pl", tags: ["social"] },
    ]);
    expect(searchIndex(index, "wordpress")).toEqual(["1", "2"]);
    expect(searchIndex(index, "lodz ftp")).toEqual(["2"]);
    expect(searchIndex(index, "social")).toEqual(["3"]);
    expect(searchIndex(index, "")).toEqual([]);
    expect(searchIndex(index, "nic")).toEqual([]);
  });

  it("wyniki < 100 ms przy 5 000 wpisów (wymaganie niefunkcjonalne)", () => {
    const items = Array.from({ length: 5000 }, (_, i) => ({
      id: String(i),
      name: `Dostęp ${i} ${i % 7 === 0 ? "WordPress" : "Hosting"}`,
      clientName: `Klient ${i % 50}`,
      url: `https://klient${i % 50}.pl/panel`,
      login: `user${i}@klient${i % 50}.pl`,
      tags: [i % 3 === 0 ? "seo" : "www"],
    }));
    const index = buildIndex(items);
    const start = performance.now();
    for (let i = 0; i < 10; i++) searchIndex(index, "klient4 wordpress");
    const avg = (performance.now() - start) / 10;
    expect(avg).toBeLessThan(100);
  });
});
