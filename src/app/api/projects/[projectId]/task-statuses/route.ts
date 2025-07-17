import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// GET /api/projects/[projectId]/task-statuses - Get all task statuses for a project
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
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    // Get task statuses for the project
    const taskStatuses = await prisma.taskStatus.findMany({
      where: {
        projectId
      },
      orderBy: {
        order: "asc"
      }
    })

    // If no custom statuses exist, return default ones
    if (taskStatuses.length === 0) {
      const defaultStatuses = [
        { id: "default-todo", name: "To Do", color: "#6B7280", order: 0, isDefault: true },
        { id: "default-progress", name: "In Progress", color: "#3B82F6", order: 1, isDefault: false },
        { id: "default-done", name: "Done", color: "#10B981", order: 2, isDefault: false }
      ]
      return NextResponse.json({ taskStatuses: defaultStatuses })
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

// POST /api/projects/[projectId]/task-statuses - Create a new task status
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
    const { name, color, isDefault } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Status name is required" },
        { status: 400 }
      )
    }

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

    // Check if status name already exists in this project
    const existingStatus = await prisma.taskStatus.findFirst({
      where: {
        projectId,
        name
      }
    })

    if (existingStatus) {
      return NextResponse.json(
        { error: "Status name already exists in this project" },
        { status: 400 }
      )
    }

    // Get the next order number
    const lastStatus = await prisma.taskStatus.findFirst({
      where: { projectId },
      orderBy: { order: "desc" }
    })

    const nextOrder = lastStatus ? lastStatus.order + 1 : 0

    // If this should be the default status, unset other defaults
    if (isDefault) {
      await prisma.taskStatus.updateMany({
        where: {
          projectId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    const taskStatus = await prisma.taskStatus.create({
      data: {
        name,
        color: color || "#6B7280",
        order: nextOrder,
        isDefault: isDefault || false,
        projectId
      }
    })

    return NextResponse.json({ taskStatus }, { status: 201 })
  } catch (error) {
    console.error("Error creating task status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
