import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// POST /api/system/task-statuses/reorder - Reorder global task statuses
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { statusIds } = await request.json()

    if (!Array.isArray(statusIds)) {
      return NextResponse.json(
        { error: "statusIds must be an array" },
        { status: 400 }
      )
    }

    // Verify all status IDs exist
    const existingStatuses = await prisma.taskStatus.findMany({
      where: {
        id: { in: statusIds }
      }
    })

    if (existingStatuses.length !== statusIds.length) {
      return NextResponse.json(
        { error: "Some status IDs are invalid" },
        { status: 400 }
      )
    }

    // Update the order of each status
    const updatePromises = statusIds.map((statusId: string, index: number) =>
      prisma.taskStatus.update({
        where: { id: statusId },
        data: { order: index }
      })
    )

    await Promise.all(updatePromises)

    // Return updated statuses
    const updatedStatuses = await prisma.taskStatus.findMany({
      orderBy: { order: "asc" }
    })

    return NextResponse.json({ taskStatuses: updatedStatuses })
  } catch (error) {
    console.error("Error reordering task statuses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
