import { prisma } from "@/lib/prisma"
import { buildTaskShareUrl, getOrCreateTaskShareToken } from "@/lib/task-share"

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
        changes: {
          not: null,
        },
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
        timeEntries: {
          select: { hours: true },
        },
        todos: {
          select: { timeSpent: true },
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

        const taskReportedHours = task.timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) ?? 0
        const subtaskReportedHours = task.todos?.reduce((sum, todo) => sum + (todo.timeSpent || 0), 0) ?? 0
        const totalReportedHours = taskReportedHours + subtaskReportedHours
        const formattedHours = Number.isInteger(totalReportedHours) ? totalReportedHours : totalReportedHours.toFixed(1)

        const estimatedHours = task.estimatedHours
        let timeInfo = `*Zaraportowany czas:* ${formattedHours}h`
        if (estimatedHours) {
          const formattedEstimated = Number.isInteger(estimatedHours) ? estimatedHours : estimatedHours.toFixed(1)
          timeInfo += ` (z planowanych ${formattedEstimated}h)`
        }

        let text = `*${task.title}*\n\n${task.changes}\n\n${timeInfo}\n\n<${shareUrl}|🔗 Zobacz zadanie>`
        if (task.githubPrUrl) {
          text += ` | <${task.githubPrUrl}|🐙 Pull Request>`
        }

        const res = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            channel: channelId,
            text,
            mrkdwn: true,
            unfurl_links: false,
            unfurl_media: false,
          }),
        })

        const data = await res.json()

        if (!data.ok) {
          console.error(`[Slack Scheduler] Failed to send task ${task.id}: ${data.error}`)
          errors.push(`Task ${task.id}: ${data.error}`)
          failedCount++
          continue
        }

        // Update task to mark as sent and clear scheduled time
        await prisma.task.update({
          where: { id: task.id },
          data: {
            changesSentAt: new Date(),
            changesScheduledSendAt: null,
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
