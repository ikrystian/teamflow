import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// GET /api/system-changes - Get visible system changes (authenticated users)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10")

    // Get only visible system changes, ordered by creation date (newest first)
    const systemChanges = await prisma.systemChange.findMany({
      where: {
        isVisible: true
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
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    })

    return NextResponse.json({ systemChanges })
  } catch (error) {
    console.error("Error fetching system changes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
