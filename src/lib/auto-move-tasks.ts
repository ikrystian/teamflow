import { prisma } from "@/lib/prisma"
import { deleteGithubBranch } from "@/lib/github"
import { sendDoneTaskChangesToSlack } from "@/lib/slack-task-message"
import { isDoneStatusName, isInProgressStatusName } from "@/lib/task-status-helpers"

const HOUR_MS = 60 * 60 * 1000

/**
 * Compute the moment a task moved into "In Progress" should auto-advance to
 * "Done". The delay equals the task's reported time (sum of time entries +
 * subtask time); when nothing is reported yet it falls back to the estimated
 * time. The cards form a per-project queue: a new card does not start counting
 * from "now" but from the latest auto-move time already scheduled in the same
 * In Progress column (so tasks are processed back-to-back), per the spec:
 *   12:00, only card, 30 min reported  -> 12:30
 *   another card already scheduled 13:00 -> this card 13:30
 *
 * Returns `null` when neither reported nor estimated time is available
 * (the card then simply stays in In Progress with no auto-move).
 */
export async function computeAutoMoveAt({
  excludeTaskId,
  projectId,
  inProgressStatusId,
  reportedHours,
  estimatedHours,
}: {
  excludeTaskId: string
  projectId: string | null
  inProgressStatusId: string
  reportedHours: number
  estimatedHours: number | null
}): Promise<Date | null> {
  const durationH = reportedHours > 0 ? reportedHours : (estimatedHours ?? 0)
  if (!durationH || durationH <= 0) return null

  // Latest auto-move time already scheduled in this column for the same project
  // (the tail of the queue). `projectId: null` tasks share their own queue.
  const tail = await prisma.task.findFirst({
    where: {
      statusId: inProgressStatusId,
      projectId: projectId,
      deletedAt: null,
      autoMoveToDoneAt: { not: null },
      id: { not: excludeTaskId },
    },
    orderBy: { autoMoveToDoneAt: "desc" },
    select: { autoMoveToDoneAt: true },
  })

  const now = new Date()
  const tailAt = tail?.autoMoveToDoneAt ?? null
  const base = tailAt && tailAt.getTime() > now.getTime() ? tailAt : now

  return new Date(base.getTime() + durationH * HOUR_MS)
}

/**
 * Move every task whose scheduled auto-move time has elapsed from "In Progress"
 * to "Done", mirroring the side effects of a manual move to Done in the task
 * PATCH endpoint (GitHub branch cleanup, auto-logging estimated time when no
 * time was reported, and posting the change note to Slack). Idempotent and
 * safe to call repeatedly (e.g. from the board's 5-minute tick or system cron).
 */
export async function processDueAutoMoves() {
  const now = new Date()

  const statuses = await prisma.taskStatus.findMany({ orderBy: { order: "asc" } })
  const inProgressIds = statuses.filter(s => isInProgressStatusName(s.name)).map(s => s.id)
  const doneStatus = statuses.find(s => isDoneStatusName(s.name))

  if (!doneStatus || inProgressIds.length === 0) {
    return {
      processed: 0,
      failed: 0,
      errors: !doneStatus ? ["No 'Done' status configured"] : ["No 'In Progress' status configured"],
    }
  }

  const dueTasks = await prisma.task.findMany({
    where: {
      autoMoveToDoneAt: { lte: now },
      statusId: { in: inProgressIds },
      deletedAt: null,
    },
    include: {
      project: { select: { id: true, githubRepo: true } },
    },
  })

  let processed = 0
  let failed = 0
  const errors: string[] = []

  for (const task of dueTasks) {
    try {
      await prisma.task.update({
        where: { id: task.id },
        data: { statusId: doneStatus.id, autoMoveToDoneAt: null },
      })

      // Clean up the GitHub branch if one was assigned (best-effort).
      if (task.githubBranchName && task.project?.githubRepo) {
        try {
          await deleteGithubBranch(task.project.githubRepo, task.githubBranchName)
        } catch (error) {
          console.error(`[Auto-move] GitHub branch cleanup failed for task ${task.id}:`, error)
        }
      }

      // Auto-log the estimated time when the task has none reported yet,
      // mirroring the manual move-to-Done behaviour in the PATCH endpoint.
      if (task.estimatedHours && task.estimatedHours > 0) {
        const [existingTimeEntries, existingSubtaskTime] = await Promise.all([
          prisma.timeEntry.count({ where: { taskId: task.id } }),
          prisma.todo.count({ where: { taskId: task.id, timeSpent: { gt: 0 } } }),
        ])

        const timeEntryUserId = task.assigneeId || task.createdById
        if (existingTimeEntries === 0 && existingSubtaskTime === 0 && timeEntryUserId) {
          await prisma.timeEntry.create({
            data: {
              hours: task.estimatedHours,
              description: "Automatycznie zarejestrowany czas (szacowany) po oznaczeniu zadania jako zrobione",
              taskId: task.id,
              userId: timeEntryUserId,
            },
          })
        }
      }

      // Post the change note to Slack (best-effort, must not block the move).
      try {
        await sendDoneTaskChangesToSlack(task.id)
      } catch (error) {
        console.error(`[Auto-move] Slack notification failed for task ${task.id}:`, error)
      }

      processed++
    } catch (error) {
      failed++
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Task ${task.id}: ${message}`)
      console.error(`[Auto-move] Failed to move task ${task.id} to Done:`, error)
    }
  }

  return { processed, failed, errors }
}
