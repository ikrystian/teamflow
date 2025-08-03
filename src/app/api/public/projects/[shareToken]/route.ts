import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/public/projects/[shareToken] - Get project data by share token (public access)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params

    if (!shareToken) {
      return NextResponse.json(
        { error: "Share token is required" },
        { status: 400 }
      )
    }

    // Find project by share token
    const project = await prisma.project.findFirst({
      where: {
        shareToken,
        archived: false // Only allow access to non-archived projects
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            },
            taskStatus: {
              select: {
                id: true,
                name: true,
                color: true,
                order: true
              }
            },
            subtasks: {
              select: {
                id: true,
                title: true,
                isCompleted: true
              }
            },
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
                createdAt: 'asc'
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
                date: 'desc'
              }
            },
            images: true,
            attachments: {
              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                  }
                }
              }
            },
            todos: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or sharing disabled" },
        { status: 404 }
      )
    }

    // Transform tasks to match the expected format
    const transformedTasks = project.tasks.map(task => ({
      ...task,
      project: {
        id: project.id,
        name: project.name,
        color: project.color,
        archived: project.archived,
        team: project.team
      }
    }))

    // Get task statuses for the project
    const taskStatuses = await prisma.taskStatus.findMany({
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
        imageUrl: project.imageUrl,
        team: project.team,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      tasks: transformedTasks,
      taskStatuses
    })
  } catch (error) {
    console.error("Error fetching shared project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
