import webpush from "web-push"
import { prisma } from "@/lib/prisma"

// Web-push delivery for task reminders (and any future notifications).
// Requires VAPID keys in env; generate them once with:
//   npx web-push generate-vapid-keys
// and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_EMAIL in .env.

export interface PushPayload {
  title: string
  body?: string
  /** URL opened when the notification is clicked (relative to the app origin). */
  url?: string
  tag?: string
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || "admin@example.com"}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  vapidConfigured = true
}

/**
 * Send a push notification to every subscription of a user. Subscriptions the
 * push service reports as gone (404/410) are deleted so the table self-heals.
 * Returns the number of successful deliveries.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0
  ensureVapid()

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subscriptions.length === 0) return 0

  const body = JSON.stringify(payload)
  let delivered = 0

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body
      )
      delivered++
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        // Subscription expired or was revoked by the browser — clean it up.
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      } else {
        console.error(`[Push] Failed to send to subscription ${sub.id}:`, error)
      }
    }
  }

  return delivered
}
