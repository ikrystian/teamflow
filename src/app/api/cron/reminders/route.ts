import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { processDueReminders } from "@/lib/reminders"
import type { Session } from "next-auth"

// Sends due task reminders as web-push notifications. Called both by the
// dashboard's 5-minute tick (authenticated user) and, optionally, by system
// cron. To run from system cron every 5 minutes:
//   */5 * * * * curl -s "http://localhost:3000/api/cron/reminders" -H "Authorization: Bearer YOUR_CRON_SECRET"
//
// Authorization: a valid CRON_SECRET bearer token OR a logged-in session is
// accepted. When CRON_SECRET is not configured the endpoint is open (matching
// the other cron endpoints).
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      const authHeader = request.headers.get("authorization")
      const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null
      const hasValidCronSecret = token === cronSecret

      if (!hasValidCronSecret) {
        const session = (await getServerSession(authOptions)) as Session | null
        if (!session?.user?.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
      }
    }

    const result = await processDueReminders()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in reminders cron handler:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
