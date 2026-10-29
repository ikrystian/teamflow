import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { AppSession as Session } from "@/lib/auth/types"

// Store the browser's push subscription for the logged-in user. The payload is
// the serialized PushSubscription from pushManager.subscribe(). Upserts on
// (userId, endpoint) so re-subscribing from the same browser doesn't duplicate.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession() as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscription = await request.json()
    const endpoint: string | undefined = subscription?.endpoint
    const p256dh: string | undefined = subscription?.keys?.p256dh
    const auth: string | undefined = subscription?.keys?.auth

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Invalid subscription payload" },
        { status: 400 }
      )
    }

    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId: session.user.id, endpoint },
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth,
        userAgent: request.headers.get("user-agent"),
      },
      update: {
        p256dh,
        auth,
        userAgent: request.headers.get("user-agent"),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving push subscription:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
