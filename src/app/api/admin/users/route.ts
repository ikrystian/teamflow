import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

// GET /api/admin/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    // Build where clause for search
    const where = search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { jobTitle: { contains: search, mode: "insensitive" as const } },
        { company: { contains: search, mode: "insensitive" as const } }
      ]
    } : {}

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          jobTitle: true,
          company: true,
          phone: true,
          location: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assignedTasks: true,
              createdTasks: true,
            }
          }
        },
        orderBy: [
          { role: "desc" }, // Admins first
          { name: "asc" }
        ],
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
