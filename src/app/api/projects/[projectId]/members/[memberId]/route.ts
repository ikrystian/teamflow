import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId, memberId } = params
    const { role } = await request.json()

    if (!role || !["member", "admin", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'member', 'admin', or 'viewer'" },
        { status: 400 }
      )
    }

    // Check if user has admin access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
                role: "admin"
              }
            }
          }
        ]
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      )
    }

    // Check if member exists
    const member = await prisma.projectMember.findUnique({
      where: {
        id: memberId,
        projectId: projectId
      },
      include: {
        user: true
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    // Prevent changing role of project creator
    if (member.userId === project.createdById) {
      return NextResponse.json(
        { error: "Cannot change role of project creator" },
        { status: 400 }
      )
    }

    // Update member role
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json({ member: updatedMember })
  } catch (error) {
    console.error("Error updating project member:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}