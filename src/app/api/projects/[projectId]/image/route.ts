import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import type { Session } from "next-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        team: {
          members: {
            some: {
              id: session.user.id
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "projects")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Delete old image file if exists
    if (project.imageUrl && project.imageUrl.startsWith("/uploads/projects/")) {
      const oldFilePath = join(process.cwd(), "public", project.imageUrl)
      try {
        if (existsSync(oldFilePath)) {
          await unlink(oldFilePath)
        }
      } catch (error) {
        console.warn("Failed to delete old project image file:", error)
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${projectId}_${timestamp}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Update project image URL in database
    const imageUrl = `/uploads/projects/${filename}`
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { imageUrl },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      message: "Project image updated successfully",
      project: updatedProject,
      imageUrl
    })
  } catch (error) {
    console.error("Error uploading project image:", error)
    return NextResponse.json(
      { error: "Failed to upload project image" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        team: {
          members: {
            some: {
              id: session.user.id
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Delete image file if exists
    if (project.imageUrl && project.imageUrl.startsWith("/uploads/projects/")) {
      const filePath = join(process.cwd(), "public", project.imageUrl)
      try {
        if (existsSync(filePath)) {
          await unlink(filePath)
        }
      } catch (error) {
        console.warn("Failed to delete project image file:", error)
      }
    }

    // Remove image URL from database
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { imageUrl: null },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      message: "Project image removed successfully",
      project: updatedProject
    })
  } catch (error) {
    console.error("Error removing project image:", error)
    return NextResponse.json(
      { error: "Failed to remove project image" },
      { status: 500 }
    )
  }
}
