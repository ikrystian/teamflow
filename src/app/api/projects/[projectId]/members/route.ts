import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: session.user.id },
          { members: { some: { userId: session.user.id } } },

        ]
      },
      include: {
        members: {
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
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({ members: project.members })
  } catch (error) {
    console.error("Error fetching project members:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const { userId, role = "member" } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
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

    // Check if user exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!userToAdd) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    })

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a project member" },
        { status: 400 }
      )
    }

    // Add user as project member
    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role
      },
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

    return NextResponse.json({ member: newMember }, { status: 201 })
  } catch (error) {
    console.error("Error adding project member:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
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

    // Prevent removing the project creator
    if (userId === project.createdById) {
      return NextResponse.json(
        { error: "Cannot remove project creator" },
        { status: 400 }
      )
    }

    // Remove user from project
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing project member:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
