import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const assigneeId = searchParams.get("assigneeId")
    const dueDate = searchParams.get("dueDate")

    // Check if user is admin
    const userIsAdmin = await isAdmin()

    let dueDateFilter = {}
    if (dueDate === "tomorrow") {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      today.setHours(0, 0, 0, 0)
      tomorrow.setHours(23, 59, 59, 999)

      dueDateFilter = {
        dueDate: {
          gte: today,
          lte: tomorrow,
        },
      }
    }

    // Build where clause based on user permissions
    const baseFilters = {
      ...(projectId && { projectId }),
      ...(assigneeId && { assigneeId }),
      ...dueDateFilter,
    }

    // If user is admin, show all tasks (except from archived projects)
    // If user is not admin, show only tasks they have access to
    const whereClause = userIsAdmin ? {
      ...baseFilters,
      OR: [
        // Tasks without projects
        {
          projectId: null
        },
        // Tasks with non-archived projects
        {
          project: {
            archived: false
          }
        }
      ]
    } : {
      ...baseFilters,
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
          projectId: undefined,
          createdById: session.user.id
        },
        // Tasks without projects assigned to the user
        {
          projectId: undefined,
          assigneeId: session.user.id
        }
      ]
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
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
                email: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            date: "desc"
          }
        },
        images: {
          orderBy: {
            createdAt: "asc"
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
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, projectId, assigneeId, priority, dueDate, startTime, endTime, estimatedHours, statusId, reminderEnabled, reminderType, reminderValue } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // Verify user has access to the project (only if projectId is provided)
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          archived: false,
          team: {
            members: {
              some: {
                id: session.user.id
              }
            }
          }
        }
      })

      if (!project) {
        return NextResponse.json(
          { error: "Project not found, archived, or access denied" },
          { status: 404 }
        )
      }
    }

    let finalStatusId = statusId

    // If statusId is provided, verify it exists globally
    if (statusId) {
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
    } else {
      // If no statusId provided, find the default status globally
      const defaultStatus = await prisma.taskStatus.findFirst({
        where: {
          isDefault: true
        }
      })

      if (defaultStatus) {
        finalStatusId = defaultStatus.id
      }
    }

    // Oblicz reminderTime jeśli przypomnienie jest włączone
    let reminderTime: Date | null = null
    if (reminderEnabled && dueDate && reminderType && reminderValue) {
      const due = new Date(dueDate)
      reminderTime = new Date(due)

      if (reminderType === "hours") {
        reminderTime.setHours(reminderTime.getHours() - reminderValue)
      } else if (reminderType === "days") {
        reminderTime.setDate(reminderTime.getDate() - reminderValue)
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        assigneeId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        estimatedHours,
        statusId: finalStatusId,
        createdById: session.user.id || null,
        reminderEnabled: reminderEnabled || false,
        reminderType: reminderEnabled ? reminderType : null,
        reminderValue: reminderEnabled ? reminderValue : null,
        reminderTime
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            archived: true
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
          }
        }
      }
    })

    // TODO: Add Slack notification when slackUserId is available in user model

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
