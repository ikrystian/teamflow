/** Typy i czyste funkcje changelogu („Co nowego”), wspólne dla serwera i przeglądarki. */

export type ChangelogEntryDto = {
  id: string
  title: string
  /** HTML z edytora TipTap — wyświetlać wyłącznie przez SafeHtml. */
  content: string
  /** ISO; null = szkic. */
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Najwięcej wpisów pokazywanych naraz w popupie na dashboardzie. */
export const MAX_UNSEEN_ENTRIES = 10

/**
 * Granica, po której wpisy są dla użytkownika nowe: data ostatnio widzianego wpisu,
 * ale nigdy wcześniej niż data założenia konta — nowe osoby nie dostają starszych nowości.
 */
export function changelogCutoff(seenAt: Date | null | undefined, accountCreatedAt: Date): Date {
  return seenAt && seenAt.getTime() > accountCreatedAt.getTime() ? seenAt : accountCreatedAt
}
