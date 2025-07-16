import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { teamId } = params

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
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: "Team not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({ members: team.members })
  } catch (error) {
    console.error("Error fetching team members:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
