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

export const TO_TEST_STATUS_NAMES = [
  "to test",
  "to-test",
  "totest",
  "do testów",
  "do testow",
  "testy",
  "testing",
  "qa",
  "test",
]

export const ARCHIVE_STATUS_NAMES = [
  "archive",
  "archiwum",
  "zarchiwizowane",
  "archived",
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

export function isToTestStatusName(name: string | null | undefined): boolean {
  return TO_TEST_STATUS_NAMES.includes(normalize(name))
}

export function isArchiveStatusName(name: string | null | undefined): boolean {
  return ARCHIVE_STATUS_NAMES.includes(normalize(name))
}

// --- Manager role board permissions ---------------------------------------
// The "manager" role has the same base permissions as a regular user, but on
// the board it is further restricted:
//   * may add and edit tasks only in the "To Do" column,
//   * may edit/move tasks from "To Test" into "Archive" or "To Do",
//   * may view but NOT edit or move tasks in "In Progress" / "Done",
//   * may not move any task INTO "In Progress" / "Done".
// These predicates are pure string logic so they can be shared by the client
// board and the API routes (the server is the source of truth).

/** Columns whose tasks a manager may edit (content changes). */
export function managerCanEditStatus(name: string | null | undefined): boolean {
  return isTodoStatusName(name) || isToTestStatusName(name)
}

/** Columns a manager may create new tasks in. */
export function managerCanCreateInStatus(name: string | null | undefined): boolean {
  return isTodoStatusName(name)
}

/** Whether a manager may pick a card up at all (reorder or move it). */
export function managerCanDragFrom(name: string | null | undefined): boolean {
  return isTodoStatusName(name) || isToTestStatusName(name)
}

/**
 * Whether a manager may move a task from `fromName` to `toName`.
 * - Reordering within an editable column (To Do / To Test) is allowed.
 * - Cross-column moves are only allowed from "To Test" into "To Do" or "Archive".
 */
export function managerCanMoveTask(
  fromName: string | null | undefined,
  toName: string | null | undefined
): boolean {
  const sameColumn = normalize(fromName) === normalize(toName)
  if (sameColumn) return managerCanEditStatus(fromName)
  if (isToTestStatusName(fromName)) {
    return isTodoStatusName(toName) || isArchiveStatusName(toName)
  }
  return false
}
