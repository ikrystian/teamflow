import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/system/workflow-log
 *
 * Internal endpoint used by GitHub Actions (auto-pr workflow) to log workflow executions,
 * especially errors.
 *
 * Authentication: Bearer token via Authorization header — must match API_TOKEN env var.
 */
export async function POST(request: NextRequest) {
  // Validate API token
  const apiToken = process.env.API_TOKEN
  const authHeader = request.headers.get("authorization")
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null

  if (!apiToken || !bearerToken || bearerToken !== apiToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rawBody = await request.text()
  const userAgent = request.headers.get("user-agent")
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null

  let payload: {
    workflow: string
    runId?: string
    branch?: string
    taskKey?: string
    error?: string
    status: "failed" | "success" | "started"
    repo?: string
    actor?: string
  }

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { workflow, runId, branch, taskKey, error, status, repo, actor } = payload

  if (!workflow || !status) {
    return NextResponse.json({ error: "Missing workflow or status" }, { status: 400 })
  }

  // Create a log entry in GithubWebhookLog so it appears in the logs tab
  const logEntry = await prisma.githubWebhookLog.create({
    data: {
      event: `workflow_${status}`,
      action: workflow,
      payload: JSON.stringify({
        workflow,
        runId,
        branch,
        taskKey,
        error,
        status,
        repo,
        actor,
      }),
      headers: JSON.stringify({
        "user-agent": userAgent,
        "content-type": request.headers.get("content-type"),
      }),
      signature: null,
      statusCode: status === "failed" ? 500 : 200,
      ipAddress,
      response: JSON.stringify({ message: "Workflow log recorded" }),
    },
  }).catch((err) => {
    console.error("[Workflow Log] Failed to create log entry:", err)
    return null
  })

  // Try to find the related task and associate or clear the workflow error
  try {
    let task = null
    if (taskKey) {
      task = await prisma.task.findFirst({
        where: { OR: [{ key: taskKey }, { key: taskKey.toUpperCase() }] },
      })
    }
    if (!task && branch) {
      task = await prisma.task.findFirst({
        where: { githubBranchName: branch },
      })
    }

    if (task) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          githubWorkflowError: status === "failed" ? (error || "Unknown workflow error") : null,
        },
      })
    }
  } catch (err) {
    console.error("[Workflow Log] Failed to update task with workflow status:", err)
  }

  return NextResponse.json({
    message: "Workflow log recorded",
    logId: logEntry?.id,
  })
}
