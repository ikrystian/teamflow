/**
 * Wyszukiwanie po nazwie, kliencie, adresie, loginie i tagach (rozdział 4.9).
 * Te pola są szyfrowane, więc indeks powstaje wyłącznie w pamięci przeglądarki
 * po odblokowaniu sejfu. Cel: < 100 ms przy 5 000 wpisów.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");
}

export type IndexEntry = { id: string; haystack: string; name: string };

export type Indexable = {
  id: string;
  name: string;
  clientName: string;
  url: string;
  login: string;
  tags: string[];
  extra?: string[];
};

export function buildIndex(items: Indexable[]): IndexEntry[] {
  return items.map((i) => ({
    id: i.id,
    name: normalize(i.name),
    haystack: normalize([i.name, i.clientName, i.url, i.login, i.tags.join(" "), ...(i.extra ?? [])].join("\u0001")),
  }));
}

/** Zwraca identyfikatory pasujące do wszystkich słów zapytania; trafienia w nazwie wyżej. */
export function searchIndex(index: IndexEntry[], query: string, limit = 200): string[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored: { id: string; score: number }[] = [];
  for (const e of index) {
    let ok = true;
    let score = 0;
    for (const t of terms) {
      const pos = e.haystack.indexOf(t);
      if (pos < 0) {
        ok = false;
        break;
      }
      if (e.name.startsWith(t)) score += 3;
      else if (e.name.includes(t)) score += 2;
      else score += 1;
    }
    if (ok) scored.push({ id: e.id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.id);
}
