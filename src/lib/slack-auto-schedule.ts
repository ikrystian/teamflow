import { prisma } from "@/lib/prisma"

// The "last scheduled send" anchor for a project: the latest point in time at
// which a task's change-note send is either still pending (changesScheduledSendAt,
// set via the manual schedule input in the task form) or was already delivered
// (changesSentAt). Soft-deleted tasks are ignored. Drives the board header
// display of the project's most recent / upcoming Slack send.
export async function getProjectLastSlackSendAt(
  projectId: string,
  excludeTaskId?: string
): Promise<Date | null> {
  const where = {
    projectId,
    deletedAt: null,
    ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
  }

  const [scheduled, sent] = await Promise.all([
    prisma.task.aggregate({
      where,
      _max: { changesScheduledSendAt: true },
    }),
    prisma.task.aggregate({
      where,
      _max: { changesSentAt: true },
    }),
  ])

  const times = [
    scheduled._max.changesScheduledSendAt,
    sent._max.changesSentAt,
  ].filter((value): value is Date => value != null)

  if (times.length === 0) return null
  return new Date(Math.max(...times.map((date) => date.getTime())))
}
