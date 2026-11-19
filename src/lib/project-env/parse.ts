/**
 * Liczba zmiennych w treści pliku .env: linie `KEY=wartość` (także z prefiksem `export`).
 * Puste linie i komentarze (`#`) są pomijane. Czysta funkcja — działa w przeglądarce i na serwerze.
 */
const VARIABLE_LINE = /^(?:export\s+)?[A-Za-z_][A-Za-z0-9_.-]*\s*=/;

export function countEnvVariables(content: string): number {
  let count = 0;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    if (VARIABLE_LINE.test(trimmed)) count++;
  }
  return count;
}
