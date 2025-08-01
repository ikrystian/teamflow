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
        },
        readBy: {
          where: {
            userId: session.user.id
          },
          select: {
            id: true,
            readAt: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    })

    // Transform the data to include isRead field
    const transformedChanges = systemChanges.map(change => ({
      ...change,
      isRead: change.readBy.length > 0,
      readBy: undefined // Remove readBy from the response
    }))

    return NextResponse.json({ systemChanges: transformedChanges })
  } catch (error) {
    console.error("Error fetching system changes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/system-changes - Mark all visible system changes as read
export async function POST() {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all visible system changes that are not yet read by this user
    const unreadChanges = await prisma.systemChange.findMany({
      where: {
        isVisible: true,
        readBy: {
          none: {
            userId: session.user.id
          }
        }
      },
      select: {
        id: true
      }
    })

    // Mark all unread changes as read
    if (unreadChanges.length > 0) {
      await prisma.systemChangeRead.createMany({
        data: unreadChanges.map(change => ({
          userId: session.user.id,
          changeId: change.id
        })),
        skipDuplicates: true
      })
    }

    return NextResponse.json({ 
      success: true, 
      markedAsRead: unreadChanges.length 
    })
  } catch (error) {
    console.error("Error marking system changes as read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
