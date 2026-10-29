"use client";

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Kopiuje do schowka i czyści go po zadanym czasie (domyślnie 30 s, rozdział 4.4).
 * Przeglądarka pozwala na zapis schowka tylko przy aktywnej karcie — to zabezpieczenie
 * „w miarę możliwości”: jeśli karta nie ma fokusu, czyszczenie nastąpi po powrocie do niej.
 */
export async function copySecret(text: string, clearAfterSeconds = 30): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (clearTimer) clearTimeout(clearTimer);
  if (clearAfterSeconds <= 0) return;
  clearTimer = setTimeout(() => {
    clearTimer = null;
    const clear = () => navigator.clipboard.writeText("").catch(() => {});
    if (document.hasFocus()) void clear();
    else window.addEventListener("focus", () => void clear(), { once: true });
  }, clearAfterSeconds * 1000);
}

export async function copyPlain(text: string) {
  await navigator.clipboard.writeText(text);
}
