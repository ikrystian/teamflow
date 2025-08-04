import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"
import { randomBytes } from "crypto"

// POST /api/projects/[projectId]/share - Generate or regenerate share token
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

    // Generate a unique share token
    const shareToken = randomBytes(32).toString('hex')


    return NextResponse.json({
      shareToken,
      shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/public/project/${shareToken}`
    })
  } catch (error) {
    console.error("Error generating share token:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[projectId]/share - Remove share token
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

    // Remove share token
    await prisma.project.update({
      where: {
        id: projectId
      },
      data: {
        shareToken: null
      }
    })

    return NextResponse.json({ message: "Share token removed successfully" })
  } catch (error) {
    console.error("Error removing share token:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET /api/projects/[projectId]/share - Get current share token
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
      },
      select: {
        shareToken: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    if (!project.shareToken) {
      return NextResponse.json({ shareToken: null, shareUrl: null })
    }

    return NextResponse.json({
      shareToken: project.shareToken,
      shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/public/project/${project.shareToken}`
    })
  } catch (error) {
    console.error("Error getting share token:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
