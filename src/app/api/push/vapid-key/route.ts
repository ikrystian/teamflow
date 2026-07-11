import { NextResponse } from "next/server"
import { getVapidPublicKey } from "@/lib/push"

// Public VAPID key used by the browser to create a push subscription
// (fetched by usePushNotifications before pushManager.subscribe).
export async function GET() {
  const publicKey = getVapidPublicKey()

  if (!publicKey) {
    return NextResponse.json(
      { error: "Push notifications are not configured (missing VAPID keys)" },
      { status: 503 }
    )
  }

  return NextResponse.json({ publicKey })
}
