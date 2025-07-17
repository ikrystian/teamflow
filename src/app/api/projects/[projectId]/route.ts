import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = params

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
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
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
                createdAt: 'desc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
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

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = params
    const { name, description, status } = await request.json()

    // Verify user has access to the project
    const existingProject = await prisma.project.findFirst({
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

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    const project = await prisma.project.update({
      where: {
        id: projectId
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status })
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = params

    // Verify user has access to the project
    const existingProject = await prisma.project.findFirst({
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

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    // Delete project (this will cascade delete tasks, subtasks, comments)
    await prisma.project.delete({
      where: {
        id: projectId
      }
    })

    return NextResponse.json({ message: "Project deleted successfully" })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
