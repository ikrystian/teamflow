import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// Type for user update data
interface UserUpdateData {
  name?: string | null
  email?: string
  role?: string
  phone?: string | null
  location?: string | null
  bio?: string | null
  jobTitle?: string | null
  company?: string | null
  website?: string | null
  password?: string
}

// Type for user with role field (workaround for Prisma type issue)
interface UserWithRole {
  id: string
  name: string | null
  email: string
  role: string
  avatarUrl: string | null
  phone: string | null
  location: string | null
  bio: string | null
  jobTitle: string | null
  company: string | null
  website: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    assignedTasks: number
    createdTasks: number
    comments: number
    timeEntries: number
  }
}

// Type for basic user info with role
interface BasicUserWithRole {
  id: string
  email: string
  role: string
}

// GET /api/admin/users/[userId] - Get specific user (admin only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getAdminSession()
    const { userId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - role field exists in database but Prisma types are not updated
        role: true,
        avatarUrl: true,
        phone: true,
        location: true,
        bio: true,
        jobTitle: true,
        company: true,
        website: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedTasks: true,
            createdTasks: true,
            comments: true,
            timeEntries: true
          }
        }
      }
    }) as unknown as UserWithRole | null

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/users/[userId] - Update user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getAdminSession()
    const { userId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      email,
      role,
      phone,
      location,
      bio,
      jobTitle,
      company,
      website,
      password
    } = body

    // Validate role if provided
    if (role && !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Prevent admin from changing their own role
    if (role && session.user.id === userId) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 })
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      })

      if (existingUser) {
        return NextResponse.json({ error: "Email already taken" }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: UserUpdateData = {}

    if (name !== undefined) updateData.name = name?.trim() || null
    if (email !== undefined) updateData.email = email.trim()
    if (role !== undefined) updateData.role = role
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (location !== undefined) updateData.location = location?.trim() || null
    if (bio !== undefined) updateData.bio = bio?.trim() || null
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle?.trim() || null
    if (company !== undefined) updateData.company = company?.trim() || null
    if (website !== undefined) updateData.website = website?.trim() || null

    // Hash password if provided
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password.trim(), 12)
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - role field exists in database but Prisma types are not updated
        role: true,
        avatarUrl: true,
        phone: true,
        location: true,
        bio: true,
        jobTitle: true,
        company: true,
        website: true,
        createdAt: true,
        updatedAt: true
      }
    }) as unknown as Omit<UserWithRole, '_count'>

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/admin/users/[userId] - Delete user (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getAdminSession()
    const { userId } = await params

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    // Prevent admin from deleting themselves
    if (session.user.id === userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - role field exists in database but Prisma types are not updated
      select: { id: true, email: true, role: true }
    }) as unknown as BasicUserWithRole | null

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
