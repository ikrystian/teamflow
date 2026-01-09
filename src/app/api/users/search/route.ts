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
    const query = searchParams.get("q")
    const projectId = searchParams.get("projectId")

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters long" },
        { status: 400 }
      )
    }

    let excludeUserIds: string[] = []

    // If projectId is provided, exclude users who are already members
    if (projectId) {
      const projectMembers = await prisma.projectMember.findMany({
        where: { projectId },
        select: { userId: true }
      })
      excludeUserIds = projectMembers.map(member => member.userId)
    }

    const capitalizedQuery = query.charAt(0).toUpperCase() + query.slice(1)

    // Search users by name or email
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            NOT: {
              id: {
                in: excludeUserIds
              }
            }
          },
          {
            OR: [
              {
                name: {
                  contains: query,
                }
              },
              {
                name: {
                  contains: capitalizedQuery,
                }
              },
              {
                email: {
                  contains: query
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      },
      take: 10, // Limit results to prevent too many results
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
