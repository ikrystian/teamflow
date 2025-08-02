import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ changeId: string }> }
) {
  try {
    const session = await getAdminSession()
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { isVisible } = await request.json()
    
    if (typeof isVisible !== 'boolean') {
      return NextResponse.json(
        { error: "isVisible must be a boolean" },
        { status: 400 }
      )
    }

    const { changeId } = await params
    
    const updatedChange = await prisma.systemChange.update({
      where: {
        id: changeId
      },
      data: {
        isVisible
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json(updatedChange)
  } catch (error) {
    console.error("Error updating system change visibility:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}