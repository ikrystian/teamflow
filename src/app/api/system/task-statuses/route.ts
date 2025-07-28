import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// GET /api/system/task-statuses - Get all global task statuses
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all task statuses ordered by order
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

// POST /api/system/task-statuses - Create a new global task status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, color, isDefault } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Status name is required" },
        { status: 400 }
      )
    }

    // Check if status name already exists
    const existingStatus = await prisma.taskStatus.findFirst({
      where: {
        name
      }
    })

    if (existingStatus) {
      return NextResponse.json(
        { error: "Status name already exists" },
        { status: 400 }
      )
    }

    // Get the next order number
    const lastStatus = await prisma.taskStatus.findFirst({
      orderBy: { order: "desc" }
    })

    const nextOrder = lastStatus ? lastStatus.order + 1 : 0

    // If this should be the default status, unset other defaults
    if (isDefault) {
      await prisma.taskStatus.updateMany({
        where: {
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
        isDefault: isDefault || false
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
