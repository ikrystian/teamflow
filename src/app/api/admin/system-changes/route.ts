import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

// GET /api/admin/system-changes - Get all system changes (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const onlyVisible = searchParams.get("onlyVisible") === "true"

    const skip = (page - 1) * limit

    const where = onlyVisible ? { isVisible: true } : {}

    // Get system changes with pagination
    const [systemChanges, total] = await Promise.all([
      prisma.systemChange.findMany({
        where,
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
        skip,
        take: limit
      }),
      prisma.systemChange.count({ where })
    ])

    return NextResponse.json({
      systemChanges,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching system changes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/system-changes - Create a new system change (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { title, description } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const systemChange = await prisma.systemChange.create({
      data: {
        title,
        description: description || null,
        type: "info",
        isVisible: true,
        createdById: session.user.id
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

    return NextResponse.json({ systemChange }, { status: 201 })
  } catch (error) {
    console.error("Error creating system change:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
