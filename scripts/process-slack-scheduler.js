#!/usr/bin/env node
/**
 * This script processes pending Slack scheduled messages
 * Run it with: node scripts/process-slack-scheduler.js
 *
 * Add to crontab with: 5 * * * * cd /path/to/teamflow && node scripts/process-slack-scheduler.js
 */

require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function buildTaskShareUrl(token) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${baseUrl}/tasks/${token}`
}

async function getOrCreateTaskShareToken(taskId) {
  // For now, just return the task ID as token
  // In production, you'd want to implement proper share token generation
  return taskId
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
        const shareUrl = await buildTaskShareUrl(shareToken)

        const text = `*${task.title}*\n\n${task.changes}\n\n<${shareUrl}|🔗 Zobacz zadanie>`

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
