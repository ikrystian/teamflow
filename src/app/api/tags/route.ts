import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tags - Get all tags
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const tags = await prisma.tag.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { taskTags: true }
                }
            }
        })

        // Map to include task count
        const tagsWithCount = tags.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
            taskCount: tag._count.taskTags
        }))

        return NextResponse.json({ tags: tagsWithCount })
    } catch (error) {
        console.error("Error fetching tags:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { name, color } = await request.json()

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: "Tag name is required" },
                { status: 400 }
            )
        }

        // Check if tag with same name already exists
        const existingTag = await prisma.tag.findUnique({
            where: { name: name.trim() }
        })

        if (existingTag) {
            return NextResponse.json(
                { error: "Tag with this name already exists" },
                { status: 409 }
            )
        }

        const tag = await prisma.tag.create({
            data: {
                name: name.trim(),
                color: color || "#6B7280"
            }
        })

        return NextResponse.json({ tag }, { status: 201 })
    } catch (error) {
        console.error("Error creating tag:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
