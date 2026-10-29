#!/usr/bin/env node
/**
 * Processes pending Slack scheduled messages without going through the HTTP
 * endpoint — a plain-JS mirror of src/lib/slack-scheduler.ts for crontab use
 * when calling the app over HTTP is not an option.
 *
 * Run it with: node scripts/process-slack-scheduler.js
 * Add to crontab with: *\/5 * * * * cd /path/to/teamflow && node scripts/process-slack-scheduler.js
 *
 * Kept in behavioural sync with src/lib/slack-scheduler.ts +
 * src/lib/task-share.ts: same task filter (incl. skipping soft-deleted tasks),
 * same share-token generation, same share URL shape, and the sent message's
 * ts/channel are recorded so it can be deleted from Slack later.
 */

require('dotenv').config()

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function buildTaskShareUrl(shareToken) {
  // Ta sama kolejność co w src/lib/env.ts: APP_URL, potem dawne NEXTAUTH_URL.
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return new URL(`/public/task/${shareToken}`, baseUrl).toString()
}

// Same lazy token generation as src/lib/task-share.ts.
async function getOrCreateTaskShareToken(taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { shareToken: true },
  })

  if (task?.shareToken) {
    return task.shareToken
  }

  const shareToken = crypto.randomBytes(24).toString('hex')
  await prisma.task.update({
    where: { id: taskId },
    data: { shareToken },
  })

  return shareToken
}

async function processPendingSlackScheduledMessages() {
  try {
    console.log('[Slack Scheduler] Starting scheduled message processing...')

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
      },
    })

    console.log(`[Slack Scheduler] Found ${dueMessages.length} messages to send`)

    const token = process.env.SLACK_BOT_TOKEN
    if (!token) {
      console.error('[Slack Scheduler] SLACK_BOT_TOKEN is not configured')
      return {
        processed: 0,
        failed: 0,
        errors: ['SLACK_BOT_TOKEN is not configured'],
      }
    }

    let processedCount = 0
    let failedCount = 0
    const errors = []

    for (const task of dueMessages) {
      try {
        const channelId = task.project?.slackChannelId
        if (!channelId) {
          console.warn(`[Slack Scheduler] Task ${task.id} has no channel configured`)
          failedCount++
          continue
        }

        const shareToken = await getOrCreateTaskShareToken(task.id)
        const shareUrl = buildTaskShareUrl(shareToken)

        const changesText = task.changes || '_Brak opisu zmian_'

        let text = `*${task.title}*\n\n${changesText}\n\n<${shareUrl}|🔗 Zobacz zadanie>`
        if (task.githubPrUrl) {
          text += ` | <${task.githubPrUrl}|🐙 Pull Request>`
        }

        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            channel: channelId,
            text,
            mrkdwn: true,
          }),
        })

        const data = await res.json()

        if (!data.ok) {
          console.error(`[Slack Scheduler] Failed to send task ${task.id}: ${data.error}`)
          errors.push(`Task ${task.id}: ${data.error}`)
          failedCount++
          continue
        }

        await prisma.task.update({
          where: { id: task.id },
          data: {
            changesSentAt: new Date(),
            changesScheduledSendAt: null,
            changesSlackTs: data.ts ?? null,
            changesSlackChannelId: data.channel ?? channelId,
          },
        })

        console.log(`[Slack Scheduler] Successfully sent task ${task.id} (${task.title})`)
        processedCount++
      } catch (error) {
        console.error(`[Slack Scheduler] Error processing task ${task.id}:`, error)
        errors.push(`Task ${task.id}: ${error.message}`)
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
    console.error('[Slack Scheduler] Unexpected error:', error)
    return {
      processed: 0,
      failed: 0,
      errors: [error.message],
    }
  }
}

// Run the function
processPendingSlackScheduledMessages()
  .then((result) => {
    console.log('Result:', JSON.stringify(result, null, 2))
    process.exit(result.failed > 0 && result.processed === 0 ? 1 : 0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
