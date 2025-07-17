import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, location, bio, jobTitle, company, website } = body

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Validate website URL format if provided
    if (website && website.trim() !== "") {
      try {
        new URL(website)
      } catch {
        return NextResponse.json({ error: "Invalid website URL" }, { status: 400 })
      }
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        location: location?.trim() || null,
        bio: bio?.trim() || null,
        jobTitle: jobTitle?.trim() || null,
        company: company?.trim() || null,
        website: website?.trim() || null,
      },
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

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
