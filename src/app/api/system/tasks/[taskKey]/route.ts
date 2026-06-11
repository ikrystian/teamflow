import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/system/tasks/[taskKey]
 *
 * Internal endpoint used by GitHub Actions (auto-pr workflow) to fetch task details
 * by task key (e.g. NE-10) without requiring a Next-Auth session.
 *
 * Authentication: Bearer token via Authorization header — must match API_TOKEN env var.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskKey: string }> }
) {
  // Validate API token
  const apiToken = process.env.API_TOKEN
  const authHeader = request.headers.get("authorization")
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null

  if (!apiToken || !bearerToken || bearerToken !== apiToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { taskKey } = await params

  const task = await prisma.task.findFirst({
    where: {
      OR: [{ key: taskKey }, { key: taskKey.toUpperCase() }]
    },
    select: {
      id: true,
      key: true,
      title: true,
      description: true,
      priority: true,
      githubBranchName: true,
      taskStatus: {
        select: { id: true, name: true }
      },
      project: {
        select: { id: true, name: true, githubRepo: true }
      }
    }
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json({ task })
}
