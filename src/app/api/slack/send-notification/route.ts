import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const slackToken = process.env.SLACK_BOT_TOKEN
    if (!slackToken) {
      return NextResponse.json(
        { error: "Slack integration not configured" },
        { status: 500 }
      )
    }

    const { userId, taskId, taskTitle, taskDescription, projectName } = await request.json()

    if (!userId || !taskId || !taskTitle) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Prepare the message blocks for better formatting
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🔔 Nowe zadanie"
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Zadanie:*\n${taskTitle}`
          },
          {
            type: "mrkdwn",
            text: `*Projekt:*\n${projectName || "Brak projektu"}`
          }
        ]
      }
    ]

    if (taskDescription) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Opis:*\n${taskDescription.replace(/<[^>]*>/g, '').substring(0, 200)}${taskDescription.length > 200 ? '...' : ''}`
        }
      })
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*ID zadania:* ${taskId}`
      }
    })

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: userId,
        text: `Nowe zadanie: ${taskTitle}`,
        blocks: blocks
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return NextResponse.json(
        { error: data.error || "Failed to send Slack message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: "Notification sent successfully" })
  } catch (error) {
    console.error("Error sending Slack notification:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}