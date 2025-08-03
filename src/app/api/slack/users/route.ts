import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

interface SlackUser {
  id: string
  is_bot: boolean
  deleted: boolean
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const slackToken = process.env.SLACK_BOT_TOKEN
    if (!slackToken) {
      return NextResponse.json(
        { error: "Slack integration not configured" },
        { status: 500 }
      )
    }

    const response = await fetch('https://slack.com/api/users.list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return NextResponse.json(
        { error: data.error || "Failed to fetch Slack users" },
        { status: 500 }
      )
    }

    // Filter out bots and deleted users
    const users = data.members.filter(
      (user: SlackUser) => !user.is_bot && !user.deleted && user.id !== 'USLACKBOT'
    )

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching Slack users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
