import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { AppSession as Session } from "@/lib/auth/types"

// Remove the browser's push subscription for the logged-in user (called after
// pushManager unsubscribe). Identified by the subscription endpoint.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession() as Session | null

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
