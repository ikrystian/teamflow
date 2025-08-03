import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params
    const { slackUserId } = await request.json()

    // Check if user can update this profile (only their own)
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: "Forbidden - can only update your own profile" },
        { status: 403 }
      )
    }

    if (!slackUserId) {
      return NextResponse.json(
        { error: "Slack user ID is required" },
        { status: 400 }
      )
    }

    // Check if this Slack user ID is already connected to another user
    const existingConnection = await prisma.user.findFirst({
      where: {
        slackUserId: slackUserId,
        id: { not: userId }
      }
    })

    if (existingConnection) {
      return NextResponse.json(
        { error: "To konto Slack jest już połączone z innym użytkownikiem" },
        { status: 400 }
      )
    }

    // Update user with Slack connection
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { slackUserId }
    })

    return NextResponse.json({
      success: true,
      slackUserId: updatedUser.slackUserId
    })
  } catch (error) {
    console.error("Error connecting Slack account:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params

    // Check if user can update this profile (only their own)
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: "Forbidden - can only update your own profile" },
        { status: 403 }
      )
    }

    // Remove Slack connection
    await prisma.user.update({
      where: { id: userId },
      data: { slackUserId: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error disconnecting Slack account:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
