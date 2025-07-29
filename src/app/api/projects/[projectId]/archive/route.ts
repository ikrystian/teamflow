import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// PATCH /api/projects/[projectId]/archive - Archive or unarchive a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const { archived } = await request.json()

    if (typeof archived !== "boolean") {
      return NextResponse.json(
        { error: "archived field must be a boolean" },
        { status: 400 }
      )
    }

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

    // Update project archived status
    const project = await prisma.project.update({
      where: {
        id: projectId
      },
      data: {
        archived
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

    return NextResponse.json({ 
      project,
      message: archived ? "Project archived successfully" : "Project unarchived successfully"
    })
  } catch (error) {
    console.error("Error updating project archive status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
