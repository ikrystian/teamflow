import { NextRequest, NextResponse } from "next/server"
import { createTasksFromCommits, type WebhookCommitPayload } from "@/lib/commit-task"

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as WebhookCommitPayload

    const result = await createTasksFromCommits({
      projectId: payload?.projectId,
      commits: payload?.commits,
      repository: payload?.repository,
      branch: payload?.branch,
      pusher: payload?.pusher,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ task: result.task }, { status: 201 })
  } catch (error) {
    console.error("Error handling commit webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
