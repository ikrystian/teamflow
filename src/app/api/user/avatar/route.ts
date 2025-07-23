import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, avatarUrl: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "avatars")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Delete old avatar file if exists
    if (currentUser.avatarUrl && currentUser.avatarUrl.startsWith("/uploads/avatars/")) {
      const oldFilePath = join(process.cwd(), "public", currentUser.avatarUrl)
      try {
        if (existsSync(oldFilePath)) {
          await unlink(oldFilePath)
        }
      } catch (error) {
        console.warn("Failed to delete old avatar file:", error)
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${currentUser.id}_${timestamp}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Update user avatar URL in database
    const avatarUrl = `/uploads/avatars/${filename}`
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        phone: true,
        location: true,
        bio: true,
        jobTitle: true,
        company: true,
        website: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      message: "Avatar updated successfully",
      user: updatedUser,
      avatarUrl
    })
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, avatarUrl: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete avatar file if exists
    if (currentUser.avatarUrl && currentUser.avatarUrl.startsWith("/uploads/avatars/")) {
      const filePath = join(process.cwd(), "public", currentUser.avatarUrl)
      try {
        if (existsSync(filePath)) {
          await unlink(filePath)
        }
      } catch (error) {
        console.warn("Failed to delete avatar file:", error)
      }
    }

    // Remove avatar URL from database
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { avatarUrl: null },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        phone: true,
        location: true,
        bio: true,
        jobTitle: true,
        company: true,
        website: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      message: "Avatar removed successfully",
      user: updatedUser
    })
  } catch (error) {
    console.error("Error removing avatar:", error)
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    )
  }
}
