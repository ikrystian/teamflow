import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// PATCH /api/projects/[projectId]/task-statuses/[statusId] - Update a task status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; statusId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId, statusId } = await params
    const { name, color, order, isDefault } = await request.json()

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

    // Verify the task status exists and belongs to this project
    const existingStatus = await prisma.taskStatus.findFirst({
      where: {
        id: statusId,
        projectId
      }
    })

    if (!existingStatus) {
      return NextResponse.json(
        { error: "Task status not found" },
        { status: 404 }
      )
    }

    // Check if new name conflicts with existing status (if name is being changed)
    if (name && name !== existingStatus.name) {
      const nameConflict = await prisma.taskStatus.findFirst({
        where: {
          projectId,
          name,
          id: { not: statusId }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: "Status name already exists in this project" },
          { status: 400 }
        )
      }
    }

    // Check if new order conflicts with existing status (if order is being changed)
    if (order !== undefined && order !== existingStatus.order) {
      const orderConflict = await prisma.taskStatus.findFirst({
        where: {
          projectId,
          order,
          id: { not: statusId }
        }
      })

      if (orderConflict) {
        return NextResponse.json(
          { error: "Status order already exists in this project" },
          { status: 400 }
        )
      }
    }

    // If this should be the default status, unset other defaults
    if (isDefault && !existingStatus.isDefault) {
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

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (color !== undefined) updateData.color = color
    if (order !== undefined) updateData.order = order
    if (isDefault !== undefined) updateData.isDefault = isDefault

    const taskStatus = await prisma.taskStatus.update({
      where: { id: statusId },
      data: updateData
    })

    return NextResponse.json({ taskStatus })
  } catch (error) {
    console.error("Error updating task status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[projectId]/task-statuses/[statusId] - Delete a task status
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; statusId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId, statusId } = await params

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

    // Verify the task status exists and belongs to this project
    const existingStatus = await prisma.taskStatus.findFirst({
      where: {
        id: statusId,
        projectId
      },
      include: {
        tasks: true
      }
    })

    if (!existingStatus) {
      return NextResponse.json(
        { error: "Task status not found" },
        { status: 404 }
      )
    }

    // Check if there are tasks using this status
    if (existingStatus.tasks.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete status that is being used by tasks" },
        { status: 400 }
      )
    }

    await prisma.taskStatus.delete({
      where: { id: statusId }
    })

    return NextResponse.json({ message: "Task status deleted successfully" })
  } catch (error) {
    console.error("Error deleting task status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
