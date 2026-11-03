// Opisy wpisów czasu tworzonych automatycznie. Raport czasu (lib/reports) rozpoznaje
// po nich, skąd pochodzą godziny, więc zmieniaj je wyłącznie tutaj.

/** Estymacja wpisana przy przeniesieniu do Done zadania bez zaraportowanego czasu. */
export const AUTO_DONE_ESTIMATE_DESCRIPTION =
  "Automatycznie zarejestrowany czas (szacowany) po oznaczeniu zadania jako zrobione"

/** Estymacja wpisana przez webhook merge requestu. */
export const MERGE_REQUEST_ESTIMATE_DESCRIPTION = "Automatyczne zalogowanie czasu zaplanowanego (merge-request)"

/** Czas commitu oszacowany przez model przy merge requeście. */
export const COMMIT_ENTRY_PREFIX = "Automatyczne zaraportowanie: "

export function commitEntryDescription(title: string): string {
  return `${COMMIT_ENTRY_PREFIX}${title}`
}
