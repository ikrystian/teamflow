import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import type { Session } from "next-auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskIds, statusId, projectId, assigneeId, action } = await request.json()

    if (action !== "delete" && action !== "archive") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let whereClause: any = {}

    if (Array.isArray(taskIds) && taskIds.length > 0) {
      whereClause = { id: { in: taskIds } }
    } else if (statusId) {
      whereClause = {
        statusId,
        deletedAt: null,
        archived: false,
        ...(projectId && { projectId }),
        ...(assigneeId && { assigneeId })
      }
    } else {
      return NextResponse.json({ error: "Either taskIds or statusId is required" }, { status: 400 })
    }

    const userIsAdmin = await isAdmin()

    // Fetch tasks to verify ownership/permissions
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: {
          include: {
            members: true
          }
        }
      }
    })

    // Filter tasks the user is allowed to modify
    const allowedTaskIds = tasks.filter(task => {
      if (userIsAdmin) return true
      if (task.createdById === session.user.id) return true
      if (task.assigneeId === session.user.id) return true
      if (task.project) {
        const isMember = task.project.members.some(m => m.userId === session.user.id)
        if (isMember) return true
      }
      return false
    }).map(t => t.id)

    if (allowedTaskIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    if (action === "delete") {
      // Soft-delete the tasks by setting deletedAt
      await prisma.task.updateMany({
        where: {
          id: { in: allowedTaskIds }
        },
        data: {
          deletedAt: new Date()
        }
      })
      return NextResponse.json({ success: true, count: allowedTaskIds.length })
    } else if (action === "archive") {
      // Archive the tasks
      await prisma.task.updateMany({
        where: {
          id: { in: allowedTaskIds }
        },
        data: {
          archived: true
        }
      })
      return NextResponse.json({ success: true, count: allowedTaskIds.length })
    }

  } catch (error) {
    console.error("Error performing bulk task action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
