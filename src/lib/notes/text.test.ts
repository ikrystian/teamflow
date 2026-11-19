import { describe, expect, it } from "vitest";
import { htmlToExcerpt } from "./text";

describe("htmlToExcerpt", () => {
  it("usuwa tagi i rozdziela akapity spacją", () => {
    expect(htmlToExcerpt("<p>Pierwszy</p><p>Drugi <strong>pogrubiony</strong></p>")).toBe("Pierwszy Drugi pogrubiony");
  });

  it("rozdziela elementy list i podziały wierszy", () => {
    expect(htmlToExcerpt("<ul><li><p>jeden</p></li><li><p>dwa</p></li></ul><p>a<br>b</p>")).toBe("jeden dwa a b");
  });

  it("dekoduje encje", () => {
    expect(htmlToExcerpt("<p>A &amp; B &lt;tag&gt; &quot;x&quot; &#39;y&#39; &#x142;&nbsp;z</p>")).toBe(`A & B <tag> "x" 'y' ł z`);
  });

  it("zostawia nieznane encje bez zmian", () => {
    expect(htmlToExcerpt("<p>&nieznana; &#0;</p>")).toBe("&nieznana; &#0;");
  });

  it("obcina długi tekst z wielokropkiem", () => {
    const out = htmlToExcerpt(`<p>${"słowo ".repeat(100)}</p>`, 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("…")).toBe(true);
  });

  it("zwraca pusty tekst dla pustej notatki", () => {
    expect(htmlToExcerpt("")).toBe("");
    expect(htmlToExcerpt("<p></p>")).toBe("");
  });
});
