import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { teamId } = await params

    // Verify user is member of the team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        members: {
          some: {
            id: session.user.id
          }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true
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

    return NextResponse.json({ team })
  } catch (error) {
    console.error("Error fetching team:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { teamId } = await params
    const { name, memberIds } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      )
    }

    // Verify user is member of the team
    const existingTeam = await prisma.team.findFirst({
      where: {
        id: teamId,
        members: {
          some: {
            id: session.user.id
          }
        }
      }
    })

    if (!existingTeam) {
      return NextResponse.json(
        { error: "Team not found or access denied" },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: { name: string, members?: { set: { id: string }[] } } = {
      name: name.trim()
    }

    // If memberIds are provided, update team members
    if (memberIds && Array.isArray(memberIds)) {
      // Validate that all member IDs exist
      const validUsers = await prisma.user.findMany({
        where: {
          id: { in: memberIds }
        },
        select: { id: true }
      })

      if (validUsers.length !== memberIds.length) {
        return NextResponse.json(
          { error: "One or more user IDs are invalid" },
          { status: 400 }
        )
      }

      // Ensure at least one member remains (prevent empty teams)
      if (memberIds.length === 0) {
        return NextResponse.json(
          { error: "Team must have at least one member" },
          { status: 400 }
        )
      }

      updateData.members = {
        set: memberIds.map((id: string) => ({ id }))
      }
    }

    const team = await prisma.team.update({
      where: {
        id: teamId
      },
      data: updateData,
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json({ team })
  } catch (error) {
    console.error("Error updating team:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
