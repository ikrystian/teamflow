import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { processDueAutoMoves } from "@/lib/auto-move-tasks"
import type { Session } from "next-auth"

// Moves tasks whose scheduled auto-move time has elapsed from "In Progress" to
// "Done". Called both by the Kanban board's 5-minute tick (authenticated user)
// and, optionally, by system cron. To run from system cron every 5 minutes:
//   */5 * * * * curl -s "http://localhost:3000/api/cron/auto-move-done" -H "Authorization: Bearer YOUR_CRON_SECRET"
//
// Authorization: a valid CRON_SECRET bearer token OR a logged-in session is
// accepted. When CRON_SECRET is not configured the endpoint is open (matching
// the existing slack-scheduler cron).
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

    const result = await processDueAutoMoves()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in auto-move cron handler:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
