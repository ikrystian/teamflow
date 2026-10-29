import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { AppSession as Session } from "@/lib/auth/types"

// PATCH /api/projects/[projectId]/archive - Archive or unarchive a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession() as Session | null

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
