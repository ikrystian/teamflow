import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// Remove the browser's push subscription for the logged-in user (called after
// pushManager unsubscribe). Identified by the subscription endpoint.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscription = await request.json()
    const endpoint: string | undefined = subscription?.endpoint

    if (!endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription payload" },
        { status: 400 }
      )
    }

    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id, endpoint },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing push subscription:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
