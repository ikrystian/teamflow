import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// POST /api/tasks/[taskId]/block - Block a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params
    const { reason } = await request.json()

    if (!reason || reason.trim() === "") {
      return NextResponse.json(
        { error: "Block reason is required" },
        { status: 400 }
      )
    }

    // Fetch task to check permissions
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          team: {
            members: {
              some: {
                id: session.user.id
              }
            }
          }
        }
      },
      include: {
        createdBy: true,
        assignee: true
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      )
    }

    // Check if user can block the task (creator or assignee)
    const canBlock = 
      existingTask.createdById === session.user.id || 
      existingTask.assigneeId === session.user.id

    if (!canBlock) {
      return NextResponse.json(
        { error: "You can only block tasks you created or are assigned to" },
        { status: 403 }
      )
    }

    // Check if task is already blocked
    if (existingTask.isBlocked) {
      return NextResponse.json(
        { error: "Task is already blocked" },
        { status: 400 }
      )
    }

    // Block the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        isBlocked: true,
        blockReason: reason.trim(),
        blockedAt: new Date(),
        blockedById: session.user.id
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        blockedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error("Error blocking task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[taskId]/block - Unblock a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params

    // Fetch task to check permissions
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          team: {
            members: {
              some: {
                id: session.user.id
              }
            }
          }
        }
      },
      include: {
        createdBy: true,
        assignee: true
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      )
    }

    // Check if user can unblock the task (creator or assignee)
    const canUnblock = 
      existingTask.createdById === session.user.id || 
      existingTask.assigneeId === session.user.id

    if (!canUnblock) {
      return NextResponse.json(
        { error: "You can only unblock tasks you created or are assigned to" },
        { status: 403 }
      )
    }

    // Check if task is actually blocked
    if (!existingTask.isBlocked) {
      return NextResponse.json(
        { error: "Task is not blocked" },
        { status: 400 }
      )
    }

    // Unblock the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        isBlocked: false,
        blockReason: null,
        blockedAt: null,
        blockedById: null
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error("Error unblocking task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
