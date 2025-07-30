import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const assigneeId = searchParams.get("assigneeId")
    const dueDate = searchParams.get("dueDate")

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

    const tasks = await prisma.task.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(assigneeId && { assigneeId }),
        ...dueDateFilter,
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
      },
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
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, projectId, assigneeId, priority, dueDate, estimatedHours, statusId } = await request.json()

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

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        assigneeId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours,
        statusId: finalStatusId,
        createdById: session.user.id || null
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
        }
      }
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
