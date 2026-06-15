import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildTaskShareUrl, getOrCreateTaskShareToken } from "@/lib/task-share"
import {
  sendTaskMessageToSlack,
  deleteTaskMessageFromSlack,
} from "@/lib/slack-task-message"
import type { Session } from "next-auth"

interface SlackSendRequest {
  scheduledFor?: string; // ISO date string for scheduled send, null to send immediately
}

// Send a task's "changes" (already formatted as Slack mrkdwn) to the project's
// configured Slack channel via the Slack Web API (chat.postMessage).
// Can be sent immediately or scheduled for later.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params
    const body = (await request.json()) as SlackSendRequest

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { project: { archived: false } },
          { projectId: null, createdById: session.user.id },
          { projectId: null, assigneeId: session.user.id },
        ],
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

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const channelId = task.project?.slackChannelId
    if (!channelId) {
      return NextResponse.json(
        { error: "This project has no Slack channel configured" },
        { status: 400 }
      )
    }

    // Schedule for later or send immediately
    if (body.scheduledFor) {
      const scheduledDate = new Date(body.scheduledFor)
      await prisma.task.update({
        where: { id: task.id },
        data: { changesScheduledSendAt: scheduledDate },
      })
      return NextResponse.json({
        success: true,
        scheduled: true,
        changesScheduledSendAt: scheduledDate,
      })
    }

    // Send immediately
    const token = process.env.SLACK_BOT_TOKEN
    if (!token) {
      return NextResponse.json(
        { error: "Slack is not configured" },
        { status: 500 }
      )
    }

    // Public, read-only link so recipients who aren't logged in can open the task.
    const shareToken = await getOrCreateTaskShareToken(task.id)
    const shareUrl = buildTaskShareUrl(shareToken)

    const todoLines = task.todos.length
      ? task.todos.map((t) => `${t.isCompleted ? "✅" : "⬜"} ${t.title}`).join("\n")
      : "_Brak podzadań_"

    const text = `*${task.title}*\n\n${todoLines}\n\n<${shareUrl}|🔗 Zobacz zadanie>`

    const result = await sendTaskMessageToSlack({
      taskId: task.id,
      channelId,
      token,
      text,
    })

    if (!result.ok) {
      console.error("Slack API error:", result.error)
      return NextResponse.json(
        { error: `Slack error: ${result.error}` },
        { status: 502 }
      )
    }

    // Record when the note was sent so the UI can mark it as already delivered,
    // plus the Slack message reference needed to delete it later.
    const sentAt = new Date()
    await prisma.task.update({
      where: { id: task.id },
      data: {
        changesSentAt: sentAt,
        changesScheduledSendAt: null,
        changesSlackTs: result.ts ?? null,
        changesSlackChannelId: result.channel ?? channelId,
      },
    })

    return NextResponse.json({ success: true, changesSentAt: sentAt })
  } catch (error) {
    console.error("Error sending task to Slack:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete a previously sent task message from its Slack channel. Useful for
// removing test messages. Clears the recorded send/scheduling state on success.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { project: { archived: false } },
          { projectId: null, createdById: session.user.id },
          { projectId: null, assigneeId: session.user.id },
        ],
      },
      select: {
        id: true,
        changesSlackTs: true,
        changesSlackChannelId: true,
        project: { select: { slackChannelId: true } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (!task.changesSlackTs) {
      return NextResponse.json(
        { error: "No sent Slack message to delete for this task" },
        { status: 400 }
      )
    }

    const token = process.env.SLACK_BOT_TOKEN
    if (!token) {
      return NextResponse.json(
        { error: "Slack is not configured" },
        { status: 500 }
      )
    }

    const channelId =
      task.changesSlackChannelId ?? task.project?.slackChannelId
    if (!channelId) {
      return NextResponse.json(
        { error: "This project has no Slack channel configured" },
        { status: 400 }
      )
    }

    const result = await deleteTaskMessageFromSlack({
      token,
      channelId,
      ts: task.changesSlackTs,
    })

    if (!result.ok) {
      console.error("Slack API error:", result.error)
      return NextResponse.json(
        { error: `Slack error: ${result.error}` },
        { status: 502 }
      )
    }

    // Clear the recorded send state so the UI reflects the message is gone.
    await prisma.task.update({
      where: { id: task.id },
      data: {
        changesSentAt: null,
        changesSlackTs: null,
        changesSlackChannelId: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task message from Slack:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
