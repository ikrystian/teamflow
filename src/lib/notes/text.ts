const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Czysty tekst z HTML-a notatki (Tiptap) do podglądu na liście. Wynik jest wyświetlany
 * jako tekst (React go escapuje), więc nie musi być bezpiecznym HTML-em.
 */
export function htmlToExcerpt(html: string, max = 160): string {
  const text = decodeEntities(
    html
      // Granice bloków i podziały wierszy rozdzielają słowa.
      .replace(/<\s*(br|\/p|\/li|\/h[1-6]|\/blockquote|\/div|\/pre)\b[^>]*>/gi, " ")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
