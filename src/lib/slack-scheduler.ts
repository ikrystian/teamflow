import { prisma } from "@/lib/prisma"
import { buildTaskShareUrl, getOrCreateTaskShareToken } from "@/lib/task-share"
import { sendTaskMessageToSlack } from "@/lib/slack-task-message"

export async function processPendingSlackScheduledMessages() {
  try {
    console.log("[Slack Scheduler] Starting scheduled message processing...")

    // Find all tasks with scheduled sends that are due
    const now = new Date()
    const dueMessages = await prisma.task.findMany({
      where: {
        changesScheduledSendAt: {
          lte: now,
        },
        deletedAt: null, // don't send scheduled messages for soft-deleted tasks
        project: {
          slackChannelId: {
            not: null,
          },
        },
      },
      include: {
        project: {
          select: { id: true, name: true, slackChannelId: true },
        },
        todos: {
          select: { title: true, isCompleted: true },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    console.log(`[Slack Scheduler] Found ${dueMessages.length} messages to send`)

    const token = process.env.SLACK_BOT_TOKEN
    if (!token) {
      console.error("[Slack Scheduler] SLACK_BOT_TOKEN is not configured")
      return {
        processed: 0,
        failed: 0,
        errors: ["SLACK_BOT_TOKEN is not configured"],
      }
    }

    let processedCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const task of dueMessages) {
      try {
        const channelId = task.project?.slackChannelId
        if (!channelId) {
          console.warn(`[Slack Scheduler] Task ${task.id} has no channel configured`)
          failedCount++
          continue
        }

        // Get share token for read-only link
        const shareToken = await getOrCreateTaskShareToken(task.id)
        const shareUrl = buildTaskShareUrl(shareToken)

        const todoLines = task.todos.length
          ? task.todos.map((t) => `${t.isCompleted ? "✅" : "⬜"} ${t.title}`).join("\n")
          : "_Brak podzadań_"

        let text = `*${task.title}*\n\n${todoLines}\n\n<${shareUrl}|🔗 Zobacz zadanie>`
        if (task.githubPrUrl) {
          text += ` | <${task.githubPrUrl}|🐙 Pull Request>`
        }

        const result = await sendTaskMessageToSlack({
          taskId: task.id,
          channelId,
          token,
          text,
        })

        if (!result.ok) {
          console.error(`[Slack Scheduler] Failed to send task ${task.id}: ${result.error}`)
          errors.push(`Task ${task.id}: ${result.error}`)
          failedCount++
          continue
        }

        // Update task to mark as sent and clear scheduled time, recording the
        // Slack message reference so it can be deleted later if needed.
        await prisma.task.update({
          where: { id: task.id },
          data: {
            changesSentAt: new Date(),
            changesScheduledSendAt: null,
            changesSlackTs: result.ts ?? null,
            changesSlackChannelId: result.channel ?? channelId,
          },
        })

        console.log(`[Slack Scheduler] Successfully sent task ${task.id} (${task.title})`)
        processedCount++
      } catch (error) {
        console.error(`[Slack Scheduler] Error processing task ${task.id}:`, error)
        errors.push(`Task ${task.id}: ${error instanceof Error ? error.message : String(error)}`)
        failedCount++
      }
    }

    console.log(
      `[Slack Scheduler] Processing complete. Processed: ${processedCount}, Failed: ${failedCount}`
    )

    return {
      processed: processedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error("[Slack Scheduler] Unexpected error:", error)
    return {
      processed: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }
}
