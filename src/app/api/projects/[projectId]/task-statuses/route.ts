import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// GET /api/projects/[projectId]/task-statuses - Get all task statuses for a project
export async function GET(
  _request: NextRequest,
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
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    // Get global task statuses
    const taskStatuses = await prisma.taskStatus.findMany({
      orderBy: {
        order: "asc"
      }
    })

    // If no statuses exist, create default ones
    if (taskStatuses.length === 0) {
      const defaultStatuses = [
        { name: "To Do", color: "#6B7280", order: 0, isDefault: true },
        { name: "In Progress", color: "#3B82F6", order: 1, isDefault: false },
        { name: "Done", color: "#10B981", order: 2, isDefault: false }
      ]

      await prisma.taskStatus.createMany({
        data: defaultStatuses
      })

      // Fetch the newly created statuses
      const newTaskStatuses = await prisma.taskStatus.findMany({
        orderBy: {
          order: "asc"
        }
      })

      return NextResponse.json({ taskStatuses: newTaskStatuses })
    }

    return NextResponse.json({ taskStatuses })
  } catch (error) {
    console.error("Error fetching task statuses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


