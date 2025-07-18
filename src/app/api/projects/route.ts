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
    const teamId = searchParams.get("teamId")

    const projects = await prisma.project.findMany({
      where: {
        ...(teamId && { teamId }),
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

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Error fetching projects:", error)
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

    const { name, description, teamId, imageUrl } = await request.json()

    if (!name || !teamId) {
      return NextResponse.json(
        { error: "Name and team ID are required" },
        { status: 400 }
      )
    }

    // Verify user is member of the team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        members: {
          some: {
            id: session.user.id
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: "Team not found or access denied" },
        { status: 404 }
      )
    }

    // Create project and default task statuses in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the project
      const project = await tx.project.create({
        data: {
          name,
          description,
          teamId,
          imageUrl
        },
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Create default task statuses
      const defaultStatuses = [
        { name: "To Do", color: "#6B7280", order: 0, isDefault: true },
        { name: "In Progress", color: "#3B82F6", order: 1, isDefault: false },
        { name: "Done", color: "#10B981", order: 2, isDefault: false }
      ]

      await tx.taskStatus.createMany({
        data: defaultStatuses.map(status => ({
          ...status,
          projectId: project.id
        }))
      })

      return project
    })

    return NextResponse.json({ project: result }, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
