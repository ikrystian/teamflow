import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyGithubWebhookSignature } from "@/lib/github"

/**
 * GitHub webhook endpoint.
 *
 * Every incoming request is stored in GithubWebhookLog before processing.
 * Handles `pull_request` events with action `closed` and `merged = true`.
 * When a PR is merged, we look for tasks whose githubBranchName matches the
 * PR head branch and move them to the "Done" status.
 *
 * Setup in GitHub:
 *   Payload URL: https://your-app.com/api/github-webhook
 *   Content type: application/json
 *   Secret: value of GITHUB_WEBHOOK_SECRET env var
 *   Events: Pull requests
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-hub-signature-256")
  const event = request.headers.get("x-github-event")
  const delivery = request.headers.get("x-github-delivery")
  const userAgent = request.headers.get("user-agent")
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null

  let parsedPayload: Record<string, unknown> = {}
  try { parsedPayload = JSON.parse(rawBody) } catch { /* non-JSON body */ }

  // Create the log entry immediately so every request is captured,
  // even if processing throws before we reach the respond() helper.
  const logEntry = await prisma.githubWebhookLog.create({
    data: {
      event: event ?? "unknown",
      action: typeof parsedPayload?.action === "string" ? parsedPayload.action : null,
      payload: rawBody || "{}",
      headers: JSON.stringify({
        "x-github-event": event,
        "x-github-delivery": delivery,
        "x-hub-signature-256": signature,
        "user-agent": userAgent,
      }),
      signature,
      ipAddress,
    },
  }).catch((err) => {
    console.error("[GitHub Webhook] Failed to create log entry:", err)
    return null
  })

  // Helper: update the log with the final response and return NextResponse
  async function respond(body: Record<string, unknown>, status = 200) {
    const responseJson = JSON.stringify(body)
    if (logEntry) {
      await prisma.githubWebhookLog.update({
        where: { id: logEntry.id },
        data: { response: responseJson, statusCode: status },
      }).catch((err) => console.error("[GitHub Webhook] Failed to update log:", err))
    }
    return NextResponse.json(body, { status })
  }

  try {
    // Verify signature if secret is configured
    const secret = process.env.GITHUB_WEBHOOK_SECRET
    if (secret) {
      const valid = await verifyGithubWebhookSignature(rawBody, signature, secret)
      if (!valid) {
        return respond({ error: "Invalid signature" }, 401)
      }
    }

    // Only handle pull_request events
    if (event !== "pull_request") {
      return respond({ message: "Event ignored" })
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return respond({ error: "Invalid JSON body" }, 400)
    }

    const pr = payload.pull_request as Record<string, unknown> | undefined

    // Only handle merged PRs
    if (payload.action !== "closed" || !pr?.merged) {
      return respond({ message: "Not a merge event" })
    }

    const headBranch = (pr.head as Record<string, unknown>)?.ref as string | undefined

    if (!headBranch) {
      return respond({ message: "No head branch" })
    }

    // Find task matching the branch
    const task = await prisma.task.findFirst({
      where: { githubBranchName: headBranch },
      include: { taskStatus: true },
    })

    if (!task) {
      return respond({ message: `No task found for branch: ${headBranch}` })
    }

    // Find the "Done" status
    const doneStatus = await prisma.taskStatus.findFirst({
      where: {
        OR: [
          { name: { equals: "Done", mode: "insensitive" } },
          { name: { equals: "Zrobione", mode: "insensitive" } },
          { name: { equals: "Completed", mode: "insensitive" } },
        ],
      },
      orderBy: { order: "desc" },
    })

    const targetStatus =
      doneStatus ??
      (await prisma.taskStatus.findFirst({ orderBy: { order: "desc" } }))

    if (!targetStatus) {
      return respond({ message: "No task status found" }, 500)
    }

    if (task.statusId === targetStatus.id) {
      return respond({ message: "Task already in done status" })
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { statusId: targetStatus.id },
    })

    console.log(
      `[GitHub Webhook] Task ${task.key || task.id} moved to "${targetStatus.name}" after PR merge on branch "${headBranch}"`
    )

    return respond({
      message: "Task updated",
      taskId: task.id,
      taskKey: task.key,
      newStatus: targetStatus.name,
    })
  } catch (error) {
    console.error("GitHub webhook error:", error)
    return respond({ error: "Internal server error" }, 500)
  }
}

/**
 * GET /api/github-webhook
 * Returns a paginated list of all logged webhook requests.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.githubWebhookLog.findMany({
        orderBy: { processedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.githubWebhookLog.count(),
    ])

    return NextResponse.json({ logs, total, page, limit })
  } catch (error) {
    console.error("GitHub webhook log fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
