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
        OR: [
          // Tasks with projects where user is a team member and project is not archived
          {
            project: {
              archived: false,
              team: {
                members: {
                  some: {
                    id: session.user.id
                  }
                }
              }
            }
          },
          // Tasks without projects created by the user
          {
            projectId: null,
            createdById: session.user.id
          },
          // Tasks without projects assigned to the user
          {
            projectId: null,
            assigneeId: session.user.id
          }
        ]
      },
      include: {
        taskStatus: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            archived: true,
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
        todos: true,
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
        },
        images: true
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
    const { title, description, statusId, priority, dueDate, assigneeId, estimatedHours } = await request.json()

    // Fetch task to check permissions
    const existingTask = await prisma.task.findUnique({
      where: {
        id: taskId
      },
      include: {
        createdBy: true,
        assignee: true,
        project: {
          include: {
            team: {
              include: {
                members: true
              }
            }
          }
        }
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    // Check permissions:
    // 1. If task has a project, user must be a team member
    // 2. User must be either the creator or assignee of the task
    let hasProjectAccess = true
    if (existingTask.project) {
      hasProjectAccess = existingTask.project.team.members.some(
        member => member.id === session.user.id
      )
    }

    if (!hasProjectAccess) {
      return NextResponse.json(
        { error: "Access denied - you are not a member of the project team" },
        { status: 403 }
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

    // If statusId is provided, verify it exists globally
    if (statusId !== undefined) {
      const taskStatus = await prisma.taskStatus.findUnique({
        where: {
          id: statusId
        }
      })

      if (!taskStatus) {
        return NextResponse.json(
          { error: "Task status not found" },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: {
      title?: string;
      description?: string;
      statusId?: string;
      priority?: string;
      dueDate?: Date | null;
      assigneeId?: string;
      estimatedHours?: number;
  } = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (statusId !== undefined) updateData.statusId = statusId
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
        subtasks: true,
        todos: true,
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
        assignee: true,
        project: {
          include: {
            team: {
              include: {
                members: true
              }
            }
          }
        }
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      )
    }

    // Check if user has permission to delete the task
    const canDelete =
      existingTask.createdById === session.user.id || // Task creator
      existingTask.assigneeId === session.user.id || // Assigned user
      (existingTask.project && existingTask.project.team.members.some(member => member.id === session.user.id)) // Team member (only for tasks with projects)

    if (!canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete this task" },
        { status: 403 }
      )
    }

    // Delete the task (cascade delete will handle related records)
    await prisma.task.delete({
      where: { id: taskId }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
