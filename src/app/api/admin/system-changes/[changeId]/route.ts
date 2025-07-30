import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

// GET /api/admin/system-changes/[changeId] - Get a specific system change (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ changeId: string }> }
) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { changeId } = await params

    const systemChange = await prisma.systemChange.findUnique({
      where: { id: changeId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    })

    if (!systemChange) {
      return NextResponse.json({ error: "System change not found" }, { status: 404 })
    }

    return NextResponse.json({ systemChange })
  } catch (error) {
    console.error("Error fetching system change:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/system-changes/[changeId] - Update a system change (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ changeId: string }> }
) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { changeId } = await params
    const { title, description } = await request.json()

    // Verify the system change exists
    const existingChange = await prisma.systemChange.findUnique({
      where: { id: changeId }
    })

    if (!existingChange) {
      return NextResponse.json({ error: "System change not found" }, { status: 404 })
    }

    const systemChange = await prisma.systemChange.update({
      where: { id: changeId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description })
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json({ systemChange })
  } catch (error) {
    console.error("Error updating system change:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/admin/system-changes/[changeId] - Delete a system change (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ changeId: string }> }
) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { changeId } = await params

    // Verify the system change exists
    const existingChange = await prisma.systemChange.findUnique({
      where: { id: changeId }
    })

    if (!existingChange) {
      return NextResponse.json({ error: "System change not found" }, { status: 404 })
    }

    await prisma.systemChange.delete({
      where: { id: changeId }
    })

    return NextResponse.json({ message: "System change deleted successfully" })
  } catch (error) {
    console.error("Error deleting system change:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
