import { prisma } from "@/lib/prisma"

// The "last scheduled send" anchor for a project: the latest point in time at
// which a task's change-note send is either still pending (changesScheduledSendAt)
// or was already delivered (changesSentAt). Soft-deleted tasks are ignored.
// This single value drives both the board header display and the offset base
// used when queuing a freshly-finished task's send.
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

// Queue this task's Slack change-note send when it lands in "Done". The send
// time is anchored to the project's latest scheduled/sent message (the base):
//   - no base, or base already in the past  -> schedule for now (cron sends it
//     within its next run, i.e. "send immediately")
//   - base still in the future              -> base + the hours reported on this
//     task, so finished work stacks up after the previous message
// Nothing happens when the task isn't in a project, the project has no Slack
// channel, or the task's note was already sent / already scheduled — the user
// keeps full control via the schedule input in the task form.
export async function autoScheduleDoneTaskSlackSend(
  taskId: string
): Promise<Date | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { slackChannelId: true } },
      timeEntries: { select: { hours: true } },
      todos: { select: { timeSpent: true } },
    },
  })

  if (
    !task ||
    !task.projectId ||
    !task.project?.slackChannelId ||
    task.changesSentAt ||
    task.changesScheduledSendAt
  ) {
    return null
  }

  const base = await getProjectLastSlackSendAt(task.projectId, task.id)
  const now = new Date()

  let scheduledAt: Date
  if (!base || base.getTime() < now.getTime()) {
    scheduledAt = now
  } else {
    const reportedHours =
      task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0) +
      task.todos.reduce((sum, todo) => sum + (todo.timeSpent ?? 0), 0)
    scheduledAt = new Date(base.getTime() + reportedHours * 60 * 60 * 1000)
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { changesScheduledSendAt: scheduledAt },
  })

  return scheduledAt
}
