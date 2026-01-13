import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tags/[id] - Get a specific tag
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const tag = await prisma.tag.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { taskTags: true }
                }
            }
        })

        if (!tag) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 })
        }

        return NextResponse.json({
            tag: {
                id: tag.id,
                name: tag.name,
                color: tag.color,
                createdAt: tag.createdAt,
                updatedAt: tag.updatedAt,
                taskCount: tag._count.taskTags
            }
        })
    } catch (error) {
        console.error("Error fetching tag:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

// PATCH /api/tags/[id] - Update a tag
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const { name, color } = await request.json()

        // Check if tag exists
        const existingTag = await prisma.tag.findUnique({
            where: { id }
        })

        if (!existingTag) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 })
        }

        // If name is being changed, check for duplicates
        if (name && name.trim() !== existingTag.name) {
            const duplicateTag = await prisma.tag.findUnique({
                where: { name: name.trim() }
            })

            if (duplicateTag) {
                return NextResponse.json(
                    { error: "Tag with this name already exists" },
                    { status: 409 }
                )
            }
        }

        const updatedTag = await prisma.tag.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(color && { color })
            }
        })

        return NextResponse.json({ tag: updatedTag })
    } catch (error) {
        console.error("Error updating tag:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

// DELETE /api/tags/[id] - Delete a tag
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        // Check if tag exists
        const existingTag = await prisma.tag.findUnique({
            where: { id }
        })

        if (!existingTag) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 })
        }

        // Delete tag (TaskTag relations will be cascaded)
        await prisma.tag.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting tag:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
