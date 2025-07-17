import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params

    // Fetch task with all related data
    const task = await prisma.task.findFirst({
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
        project: {
          select: {
            id: true,
            name: true,
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
        subtasks: true,
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            date: "desc"
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params
    const { title, description, status, priority, dueDate, assigneeId, estimatedHours } = await request.json()

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

    // Check if user can edit this task (creator or assignee)
    const canEdit = existingTask.createdById === session.user.id || 
                   existingTask.assigneeId === session.user.id

    if (!canEdit) {
      return NextResponse.json(
        { error: "You can only edit tasks you created or are assigned to" },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
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
        subtasks: true,
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            date: "desc"
          }
        }
      }
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
