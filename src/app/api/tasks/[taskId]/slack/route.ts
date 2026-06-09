import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildTaskShareUrl, getOrCreateTaskShareToken } from "@/lib/task-share"
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
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (!task.changes) {
      return NextResponse.json(
        { error: "Task has no changes to send" },
        { status: 400 }
      )
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

    // A short header above the changes so the Slack message has context, plus a
    // link to the full read-only task view at the bottom.
    const text = `*${task.title}*\n\n${task.changes}\n\n<${shareUrl}|🔗 Zobacz zadanie>`

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
      }),
    })

    const data = await res.json()

    if (!data.ok) {
      console.error("Slack API error:", data.error)
      return NextResponse.json(
        { error: `Slack error: ${data.error}` },
        { status: 502 }
      )
    }

    // Record when the note was sent so the UI can mark it as already delivered.
    const sentAt = new Date()
    await prisma.task.update({
      where: { id: task.id },
      data: { changesSentAt: sentAt, changesScheduledSendAt: null },
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
