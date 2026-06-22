// Shared task-status name matching. SQLite equality is case-sensitive, so we
// match status names in JS (lowercased, trimmed) rather than relying on
// Prisma's `mode: "insensitive"`. Status names are user-editable, so each
// concept lists the common Polish/English variants.

export const DONE_STATUS_NAMES = [
  "done",
  "zrobione",
  "completed",
  "gotowe",
  "ukończone",
  "ukonczone",
  "zakończone",
  "zakonczone",
]

export const IN_PROGRESS_STATUS_NAMES = [
  "in progress",
  "in-progress",
  "inprogress",
  "w toku",
  "w trakcie",
  "doing",
  "w realizacji",
  "realizacja",
]

export const TODO_STATUS_NAMES = [
  "to do",
  "todo",
  "to-do",
  "do zrobienia",
  "backlog",
  "nowe",
  "oczekujące",
  "oczekujace",
]

function normalize(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase()
}

export function isDoneStatusName(name: string | null | undefined): boolean {
  return DONE_STATUS_NAMES.includes(normalize(name))
}

export function isInProgressStatusName(name: string | null | undefined): boolean {
  return IN_PROGRESS_STATUS_NAMES.includes(normalize(name))
}

export function isTodoStatusName(name: string | null | undefined): boolean {
  return TODO_STATUS_NAMES.includes(normalize(name))
}
