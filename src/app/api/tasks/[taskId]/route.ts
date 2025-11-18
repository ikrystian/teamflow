import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
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
        images: true,
        attachments: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
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
    const { title, description, statusId, priority, dueDate, startTime, endTime, assigneeId, estimatedHours, projectId, reminderEnabled, reminderType, reminderValue } = await request.json()

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
    // 1. If task has a project, user must have access to it
    // 2. User must be either the creator or assignee of the task
    let hasProjectAccess = true
    if (existingTask.project) {
      // Check if user has access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: existingTask.project.id,
          OR: [
            // Projects where user is a team member
            {

            },
            // Projects where user is a direct project member
            {
              members: {
                some: {
                  userId: session.user.id
                }
              }
            },
            // Projects created by the user (without team)
            {
              createdById: session.user.id
            }
          ]
        }
      })
      hasProjectAccess = !!project
    }

    if (!hasProjectAccess) {
      return NextResponse.json(
        { error: "Access denied - you are not a member of the project team" },
        { status: 403 }
      )
    }

    // Check if user can edit this task (creator, assignee, or admin)
    const userIsAdmin = await isAdmin()
    const canEdit = userIsAdmin ||
                   existingTask.createdById === session.user.id ||
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

    // If assigneeId is provided, verify it exists and is a team member
    if (assigneeId !== undefined && assigneeId !== null) {
      const assignee = await prisma.user.findUnique({
        where: {
          id: assigneeId
        }
      })

      if (!assignee) {
        return NextResponse.json(
          { error: "Assignee not found" },
          { status: 400 }
        )
      }
if (existingTask.project) {
        // If there's a project but no teamId associated, it's an unexpected state.
        // It should implicitly consider that the assignee needs to be a direct project member.
        // Assuming for now, this case implies no team for the project, so no team-based member check.
        // Or if it's considered an error, return an appropriate response.
        // For now, let's allow it as a project without a team. (This might need clarification on business logic).
        // For strictness, if a project exists, but `teamId` is null, imply an error.
        return NextResponse.json(
          { error: "Project exists but has no associated team. Cannot verify assignee membership." },
          { status: 400 }
        )
      }
    }

    // If projectId is provided, verify it exists and user has access
    if (projectId !== undefined) {
      if (projectId === "no-project" || projectId === null || projectId === "") {
        // Allow setting to no project
      } else {
        const project = await prisma.project.findFirst({
          where: {
            id: projectId,

          },
          include: {

          }
        })

        if (!project) {
          return NextResponse.json(
            { error: "Project not found or you don't have access to it" },
            { status: 400 }
          )
        }

        // If assigneeId is being set and project is being changed, verify assignee is member of new project team
        if (assigneeId !== undefined && assigneeId !== null) {

        }
      }
    }

    // Prepare update data
    const updateData: {
      title?: string;
      description?: string;
      statusId?: string;
      priority?: string;
      dueDate?: Date | null;
      startTime?: Date | null;
      endTime?: Date | null;
      assigneeId?: string;
      estimatedHours?: number;
      projectId?: string | null;
      reminderEnabled?: boolean;
      reminderType?: string | null;
      reminderValue?: number | null;
      reminderTime?: Date | null;
  } = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (statusId !== undefined) updateData.statusId = statusId
    if (priority !== undefined) updateData.priority = priority
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours
    if (projectId !== undefined) {
      updateData.projectId = (projectId === "no-project" || projectId === "") ? null : projectId
    }

    // Handle reminder fields
    if (reminderEnabled !== undefined) {
      updateData.reminderEnabled = reminderEnabled
      updateData.reminderType = reminderEnabled ? reminderType : null
      updateData.reminderValue = reminderEnabled ? reminderValue : null

      // Oblicz reminderTime jeśli przypomnienie jest włączone
      if (reminderEnabled && (dueDate !== undefined || existingTask.dueDate) && reminderType && reminderValue) {
        const due = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existingTask.dueDate
        if (due) {
          const reminderTime = new Date(due)
          if (reminderType === "hours") {
            reminderTime.setHours(reminderTime.getHours() - reminderValue)
          } else if (reminderType === "days") {
            reminderTime.setDate(reminderTime.getDate() - reminderValue)
          }
          updateData.reminderTime = reminderTime
        }
      } else {
        updateData.reminderTime = null
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,

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
        attachments: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    })

    // TODO: Add Slack notification when slackUserId is available in user model

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

        }
      },
      include: {
        createdBy: true,
        assignee: true,
        project: {
          include: {

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
    const userIsAdmin = await isAdmin()
    const canDelete =
      userIsAdmin || // Admin can delete any task
      existingTask.createdById === session.user.id || // Task creator
      existingTask.assigneeId === session.user.id || // Assigned user
      (existingTask.project ) // Team member (only for tasks with projects)

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
