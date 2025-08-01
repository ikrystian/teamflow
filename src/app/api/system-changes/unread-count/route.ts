import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// GET /api/system-changes/unread-count - Get count of unread system changes
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Count unread system changes for the current user
    const unreadCount = await prisma.systemChange.count({
      where: {
        isVisible: true,
        readBy: {
          none: {
            userId: session.user.id
          }
        }
      }
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error("Error fetching unread count:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}