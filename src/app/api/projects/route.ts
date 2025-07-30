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
    const includeArchived = searchParams.get("includeArchived") === "true"
    const archivedOnly = searchParams.get("archivedOnly") === "true"

    // Określ warunki filtrowania na podstawie parametrów
    let archivedCondition = {}
    if (archivedOnly) {
      archivedCondition = { archived: true }
    } else if (!includeArchived) {
      archivedCondition = { archived: false }
    }
    // Jeśli includeArchived=true i archivedOnly=false, nie dodajemy warunków archived

    const projects = await prisma.project.findMany({
      where: {
        ...(teamId && { teamId }),
        ...archivedCondition,
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
            statusId: true,
            taskStatus: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
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

    const { name, description, teamId, imageUrl, color } = await request.json()

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

    // Create the project (statusy są teraz globalne, nie tworzymy ich per projekt)
    const result = await prisma.project.create({
      data: {
        name,
        description,
        teamId,
        imageUrl,
        color: color || "#3B82F6", // Domyślny kolor jeśli nie podano
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

    return NextResponse.json({ project: result }, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
