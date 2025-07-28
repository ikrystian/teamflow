import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

interface TaskStatusUpdateInput {
  name?: string;
  color?: string;
  order?: number;
  isDefault?: boolean;
}

// PATCH /api/system/task-statuses/[statusId] - Update a global task status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ statusId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { statusId } = await params
    const { name, color, order, isDefault } = await request.json()

    // Verify the status exists
    const existingStatus = await prisma.taskStatus.findUnique({
      where: { id: statusId }
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
          name,
          id: { not: statusId }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: "Status name already exists" },
          { status: 400 }
        )
      }
    }

    // Check if new order conflicts with existing status (if order is being changed)
    if (order !== undefined && order !== existingStatus.order) {
      const orderConflict = await prisma.taskStatus.findFirst({
        where: {
          order,
          id: { not: statusId }
        }
      })

      if (orderConflict) {
        return NextResponse.json(
          { error: "Status order already exists" },
          { status: 400 }
        )
      }
    }

    // If this should be the default status, unset other defaults
    if (isDefault && !existingStatus.isDefault) {
      await prisma.taskStatus.updateMany({
        where: {
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Update the status
    const updatedStatus = await prisma.taskStatus.update({
      where: { id: statusId },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
        ...(isDefault !== undefined && { isDefault })
      }
    })

    return NextResponse.json({ taskStatus: updatedStatus })
  } catch (error) {
    console.error("Error updating task status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/system/task-statuses/[statusId] - Delete a global task status
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ statusId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { statusId } = await params

    // Verify the status exists
    const existingStatus = await prisma.taskStatus.findUnique({
      where: { id: statusId },
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

    // Check if status is being used by any tasks
    if (existingStatus.tasks.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete status that is being used by tasks" },
        { status: 400 }
      )
    }

    // Delete the status
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
