import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import type { Session } from "next-auth"

// Restore a soft-deleted task (undo a delete) by clearing its deletedAt marker.
// Mirrors the permission rules of the task DELETE handler.
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

    // taskId may be a key (e.g. "PS-12") or an internal id. Soft-deleted tasks
    // are intentionally found here (no deletedAt filter) so they can be restored.
    const existingTask = await prisma.task.findFirst({
      where: {
        OR: [{ key: taskId }, { id: taskId }],
      },
      include: {
        createdBy: true,
        assignee: true,
        project: true,
      },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      )
    }

    // Same permission model as deletion.
    const userIsAdmin = await isAdmin()
    let canRestore =
      userIsAdmin ||
      existingTask.createdById === session.user.id ||
      existingTask.assigneeId === session.user.id

    if (!canRestore && existingTask.project) {
      const isMember = await prisma.projectMember.findFirst({
        where: {
          projectId: existingTask.project.id,
          userId: session.user.id,
        },
      })
      canRestore = !!isMember
    }

    if (!canRestore) {
      return NextResponse.json(
        { error: "You don't have permission to restore this task" },
        { status: 403 }
      )
    }

    await prisma.task.update({
      where: { id: existingTask.id },
      data: { deletedAt: null },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error restoring task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
