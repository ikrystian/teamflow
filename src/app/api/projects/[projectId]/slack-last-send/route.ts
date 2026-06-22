import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProjectLastSlackSendAt } from "@/lib/slack-auto-schedule"
import type { Session } from "next-auth"

// Returns the date of the latest scheduled (pending) or already-sent Slack
// change-note message in this project — shown at the top of the Kanban board.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { members: { some: { userId: session.user.id } } },
          { createdById: session.user.id },
        ],
      },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    const lastSlackSendAt = await getProjectLastSlackSendAt(projectId)

    return NextResponse.json({
      lastSlackSendAt: lastSlackSendAt?.toISOString() ?? null,
    })
  } catch (error) {
    console.error("Error fetching last Slack send:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
