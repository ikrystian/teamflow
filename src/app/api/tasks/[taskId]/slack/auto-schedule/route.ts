import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// Called when a card lands in the "Done" column. Queues this task's Slack send
// right after the latest pending scheduled send in the same project: the new
// time is that send's time plus the hours reported on this task (time entries
// + subtask time). When the project has no pending scheduled send, or the
// task's notes were already sent / already scheduled, nothing happens —
// the user keeps full control via the schedule input in the task form.
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
        timeEntries: { select: { hours: true } },
        todos: { select: { timeSpent: true } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (
      !task.projectId ||
      task.changesSentAt ||
      task.changesScheduledSendAt
    ) {
      return NextResponse.json({ scheduled: false })
    }

    // The latest pending scheduled send among the other tasks of this project.
    const latest = await prisma.task.findFirst({
      where: {
        projectId: task.projectId,
        id: { not: task.id },
        changesScheduledSendAt: { not: null },
      },
      orderBy: { changesScheduledSendAt: "desc" },
      select: { changesScheduledSendAt: true },
    })

    if (!latest?.changesScheduledSendAt) {
      return NextResponse.json({ scheduled: false })
    }

    const reportedHours =
      task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0) +
      task.todos.reduce((sum, todo) => sum + (todo.timeSpent ?? 0), 0)

    const scheduledAt = new Date(
      latest.changesScheduledSendAt.getTime() + reportedHours * 60 * 60 * 1000
    )

    await prisma.task.update({
      where: { id: task.id },
      data: { changesScheduledSendAt: scheduledAt },
    })

    return NextResponse.json({
      scheduled: true,
      changesScheduledSendAt: scheduledAt,
    })
  } catch (error) {
    console.error("Error auto-scheduling Slack send:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
