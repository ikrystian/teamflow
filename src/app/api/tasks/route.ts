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

    const tasks = await prisma.task.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(assigneeId && { assigneeId }),
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

    const { title, description, projectId, assigneeId, priority, dueDate } = await request.json()

    if (!title || !projectId) {
      return NextResponse.json(
        { error: "Title and project ID are required" },
        { status: 400 }
      )
    }

    // Verify user has access to the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        assigneeId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
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
