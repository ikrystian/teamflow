import { prisma } from "@/lib/prisma"
import { sendPushToUser, isPushConfigured } from "@/lib/push"
import { isDoneStatusName } from "@/lib/task-status-helpers"

/**
 * Deliver every task reminder whose time has elapsed as a web-push
 * notification to the task's assignee (falling back to the creator).
 * Each reminder fires once: delivery is recorded in reminderSentAt, which the
 * task PATCH/POST endpoints reset whenever the reminder is (re)scheduled.
 * Idempotent and safe to call repeatedly (5-minute dashboard tick or cron).
 */
export async function processDueReminders() {
  if (!isPushConfigured()) {
    return { processed: 0, failed: 0, errors: ["Push notifications are not configured (missing VAPID keys)"] }
  }

  const now = new Date()

  const dueTasks = await prisma.task.findMany({
    where: {
      reminderEnabled: true,
      reminderTime: { lte: now },
      reminderSentAt: null,
      deletedAt: null,
      archived: false,
    },
    include: {
      taskStatus: { select: { name: true } },
    },
  })

  let processed = 0
  let failed = 0
  const errors: string[] = []

  for (const task of dueTasks) {
    try {
      const recipientId = task.assigneeId || task.createdById
      const isDone = isDoneStatusName(task.taskStatus?.name)

      // Done tasks (or tasks with nobody to notify) are marked as handled
      // without a push so they aren't rescanned every tick.
      if (recipientId && !isDone) {
        const dueText = task.dueDate
          ? `Termin: ${task.dueDate.toLocaleString("pl-PL", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}`
          : undefined

        await sendPushToUser(recipientId, {
          title: `Przypomnienie: ${task.title}`,
          body: dueText,
          tag: `task-reminder-${task.id}`,
          url: task.projectId ? `/dashboard/projects/${task.projectId}` : "/dashboard/tasks",
        })
      }

      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSentAt: now },
      })

      processed++
    } catch (error) {
      failed++
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Task ${task.id}: ${message}`)
      console.error(`[Reminders] Failed to process reminder for task ${task.id}:`, error)
    }
  }

  return { processed, failed, errors }
}
