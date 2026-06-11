import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyGithubWebhookSignature } from "@/lib/github"

/**
 * GitHub webhook endpoint.
 *
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
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-hub-signature-256")
    const event = request.headers.get("x-github-event")

    // Verify signature if secret is configured
    const secret = process.env.GITHUB_WEBHOOK_SECRET
    if (secret) {
      const valid = await verifyGithubWebhookSignature(rawBody, signature, secret)
      if (!valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Only handle pull_request events
    if (event !== "pull_request") {
      return NextResponse.json({ message: "Event ignored" })
    }

    const payload = JSON.parse(rawBody)

    // Only handle merged PRs
    if (payload.action !== "closed" || !payload.pull_request?.merged) {
      return NextResponse.json({ message: "Not a merge event" })
    }

    const headBranch: string = payload.pull_request.head.ref

    if (!headBranch) {
      return NextResponse.json({ message: "No head branch" })
    }

    // Find task matching the branch
    const task = await prisma.task.findFirst({
      where: { githubBranchName: headBranch },
      include: { taskStatus: true }
    })

    if (!task) {
      return NextResponse.json({ message: `No task found for branch: ${headBranch}` })
    }

    // Find the "Done" status (highest order, or the one named "Done")
    const doneStatus = await prisma.taskStatus.findFirst({
      where: {
        OR: [
          { name: { equals: "Done", mode: "insensitive" } },
          { name: { equals: "Zrobione", mode: "insensitive" } },
          { name: { equals: "Completed", mode: "insensitive" } },
        ]
      },
      orderBy: { order: "desc" }
    })

    // Fallback: pick the status with the highest order number
    const targetStatus = doneStatus ?? await prisma.taskStatus.findFirst({
      orderBy: { order: "desc" }
    })

    if (!targetStatus) {
      return NextResponse.json({ message: "No task status found" }, { status: 500 })
    }

    // Skip if already in that status
    if (task.statusId === targetStatus.id) {
      return NextResponse.json({ message: "Task already in done status" })
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { statusId: targetStatus.id }
    })

    console.log(`[GitHub Webhook] Task ${task.key || task.id} moved to "${targetStatus.name}" after PR merge on branch "${headBranch}"`)

    return NextResponse.json({
      message: "Task updated",
      taskId: task.id,
      taskKey: task.key,
      newStatus: targetStatus.name
    })
  } catch (error) {
    console.error("GitHub webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
