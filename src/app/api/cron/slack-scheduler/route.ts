import { NextRequest, NextResponse } from "next/server"
import { processPendingSlackScheduledMessages } from "@/lib/slack-scheduler"

// This endpoint is called by system cron every 5 minutes
// To add this to your system cron, run: crontab -e
// Then add the following line:
// */5 * * * * curl -s "http://localhost:3000/api/cron/slack-scheduler" -H "Authorization: Bearer YOUR_CRON_SECRET"
//
// Or if your app runs on a different port/domain:
// */5 * * * * curl -s "https://your-domain.com/api/cron/slack-scheduler" -H "Authorization: Bearer YOUR_CRON_SECRET"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get("authorization")
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Missing or invalid authorization header" },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      if (token !== cronSecret) {
        return NextResponse.json(
          { error: "Invalid authorization token" },
          { status: 401 }
        )
      }
    }

    const result = await processPendingSlackScheduledMessages()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in cron handler:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
