import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { deleteGithubBranch } from "@/lib/github"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODEL = "deepseek/deepseek-v4-flash"

// Convert a public GitHub commit/compare URL into raw diff content so the model
// has the actual changes to reason about. Falls back to null on any failure.
// Works for both single-commit URLs and compare URLs; `.diff` is appended when
// it is not already present.
async function fetchGithubDiff(
  url: string,
  maxChars = 12000
): Promise<string | null> {
  try {
    const diffUrl = url.endsWith(".diff") ? url : `${url}.diff`

    const res = await fetch(diffUrl, {
      headers: {
        Accept: "application/vnd.github.v3.diff, text/plain",
        "User-Agent": "Nexus-Webhook",
      },
    })

    if (!res.ok) {
      console.error(`Failed to fetch diff (${res.status}): ${diffUrl}`)
      return null
    }

    const text = await res.text()
    // Keep the payload to the model bounded.
    return text.slice(0, maxChars)
  } catch (error) {
    console.error("Error fetching diff content:", error)
    return null
  }
}

// Shared OpenRouter call that expects a JSON object back. Returns the parsed
// object, or null on any failure.
async function callOpenRouterJson(
  systemPrompt: string,
  userPrompt: string
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not configured")
    return null
  }

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error(`OpenRouter request failed (${res.status}): ${errBody}`)
      return null
    }

    const data = await res.json()
    const content: string | undefined = data?.choices?.[0]?.message?.content

    if (!content) {
      console.error("OpenRouter response missing content")
      return null
    }

    // The model may wrap the JSON in markdown fences; strip them defensively.
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim()

    return JSON.parse(cleaned) as Record<string, unknown>
  } catch (error) {
    console.error("Error calling OpenRouter:", error)
    return null
  }
}

/**
 * Merge-request webhook endpoint.
 *
 * Called by the deploy workflow after a pull request is merged into main.
 * The flow is:
 *   1. Identify the merged head branch (from the merge commit message).
 *   2. Find the task that owns that branch (by githubBranchName or task key).
 *   3. Fetch the merge diff and ask the model (DeepSeek via OpenRouter) for a
 *      list of the code changes it introduced.
 *   4. Save that list into the task's `changes` field and move it to "Done".
 *
 * Expected JSON payload:
 *   {
 *     "repository": "owner/repo",
 *     "projectId": "<project id>",
 *     "headCommitMessage": "Merge pull request #22 from owner/feature/ne-12-...",
 *     "branch": "feature/ne-12-...",   // optional, overrides parsing
 *     "before": "<sha>",
 *     "after": "<merge sha>",
 *     "commits": ["https://github.com/owner/repo/commit/<sha>", ...]
 *   }
 */
interface MergeRequestPayload {
  repository?: string
  projectId?: string
  headCommitMessage?: string
  branch?: string
  before?: string
  after?: string
  commits?: string[]
}

// Done-equivalent status names, lowercased. SQLite equality is case-sensitive,
// so we match in JS rather than relying on Prisma's `mode: "insensitive"`.
const DONE_STATUS_NAMES = [
  "done",
  "zrobione",
  "completed",
  "gotowe",
  "ukończone",
  "ukonczone",
  "zakończone",
  "zakonczone",
]

const MAX_DIFF_CHARS = 14000

// Derive the merged head branch. An explicit `branch` wins; otherwise parse the
// standard "Merge pull request #N from <owner>/<branch>" commit message. The
// branch itself may contain slashes (feature/ne-12-...), so we only strip the
// leading owner segment.
function extractMergedBranch(payload: MergeRequestPayload): string | null {
  if (payload.branch?.trim()) return payload.branch.trim()

  const firstLine = (payload.headCommitMessage ?? "").split("\n")[0]
  const match = firstLine.match(/Merge pull request #\d+ from [^/\s]+\/(.+)$/)
  return match ? match[1].trim() : null
}

// Pull a task key out of a branch name, e.g. "feature/ne-12-foo" -> "NE-12".
function extractTaskKey(branch: string): string | null {
  const match = branch.match(/([a-zA-Z]{2,})-(\d+)/)
  return match ? `${match[1].toUpperCase()}-${match[2]}` : null
}

// Build the diff text to send to the model. Prefers the merge commit's net diff
// (which captures the whole PR against its base); falls back to concatenating
// the individual commit diffs.
async function buildMergeDiff(
  payload: MergeRequestPayload
): Promise<string | null> {
  if (payload.repository && payload.after) {
    const mergeUrl = `https://github.com/${payload.repository}/commit/${payload.after}`
    const diff = await fetchGithubDiff(mergeUrl, MAX_DIFF_CHARS)
    if (diff && diff.trim()) return diff
  }

  if (Array.isArray(payload.commits)) {
    const parts: string[] = []
    let total = 0
    for (const commitUrl of payload.commits) {
      if (total >= MAX_DIFF_CHARS) break
      const diff = await fetchGithubDiff(commitUrl, MAX_DIFF_CHARS - total)
      if (diff) {
        parts.push(diff)
        total += diff.length
      }
    }
    if (parts.length > 0) return parts.join("\n\n")
  }

  return null
}

// Ask the model to summarize the merge diff into a Slack-ready list of changes.
async function generateChanges(
  payload: MergeRequestPayload,
  branch: string,
  task: { key: string | null; title: string },
  diff: string
): Promise<string | null> {
  const systemPrompt =
    "You are an assistant that analyzes the full diff of a merged pull request " +
    "and produces a concise list of the code changes it introduced. Respond ONLY " +
    'with a JSON object of the shape {"changes": string}. ' +
    "The changes field is a description, based on the actual code, of what was " +
    "changed/done in this merge request. It will be sent to Slack, so format it " +
    "using Slack mrkdwn: a bullet list where each line starts with a relevant " +
    "emoji (e.g. '• ✨ ...', '• 🐛 ...', '• ♻️ ...'), use *bold* for emphasis and " +
    "`code` for identifiers. Do NOT use standard markdown like ** or # headings. " +
    "Write the changes in Polish."

  const userPrompt =
    `Repository: ${payload.repository ?? ""}\n` +
    `Merged branch: ${branch}\n` +
    `Task: ${task.key ?? ""} ${task.title}\n\n` +
    `Based on the following merge request diff, list the code changes:\n\n${diff}`

  const parsed = await callOpenRouterJson(systemPrompt, userPrompt)

  if (!parsed || typeof parsed.changes !== "string" || !parsed.changes.trim()) {
    console.error("Merge-request response missing changes")
    return null
  }

  return parsed.changes
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const userAgent = request.headers.get("user-agent")
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null

  const logEntry = await prisma.githubWebhookLog.create({
    data: {
      event: "merge-request",
      action: null,
      payload: rawBody || "{}",
      headers: JSON.stringify({
        "user-agent": userAgent,
        "content-type": request.headers.get("content-type"),
      }),
      signature: null,
      ipAddress,
    },
  }).catch((err) => {
    console.error("[Merge Request] Failed to create log entry:", err)
    return null
  })

  async function respond(body: Record<string, unknown>, status = 200) {
    const responseJson = JSON.stringify(body)
    if (logEntry) {
      await prisma.githubWebhookLog.update({
        where: { id: logEntry.id },
        data: { response: responseJson, statusCode: status },
      }).catch((err) => console.error("[Merge Request] Failed to update log:", err))
    }
    return NextResponse.json(body, { status })
  }

  try {
    let payload: MergeRequestPayload
    try {
      payload = JSON.parse(rawBody) as MergeRequestPayload
    } catch {
      return respond({ error: "Invalid JSON body" }, 400)
    }

    if (!payload?.projectId) {
      return respond({ error: "projectId is required" }, 400)
    }

    const project = await prisma.project.findUnique({
      where: { id: payload.projectId },
    })

    if (!project) {
      return respond({ error: "Project not found" }, 404)
    }

    // 1. Determine the merged branch.
    const branch = extractMergedBranch(payload)
    if (!branch) {
      return respond(
        { error: "Could not determine merged branch from payload" },
        400
      )
    }

    // 2. Find the task that belongs to the merge request: first by the saved
    //    branch name, then by the task key embedded in the branch.
    let task = await prisma.task.findFirst({
      where: { githubBranchName: branch, projectId: payload.projectId },
    })

    if (!task) {
      const key = extractTaskKey(branch)
      if (key) {
        task = await prisma.task.findFirst({
          where: { key, projectId: payload.projectId },
        })
      }
    }

    if (!task) {
      return respond(
        { message: `No task found for merged branch: ${branch}` },
        404
      )
    }

    // 3. Fetch the diff and ask the model for the list of changes.
    const diff = await buildMergeDiff(payload)
    if (!diff) {
      return respond(
        { error: "Could not fetch merge request diff" },
        502
      )
    }

    const changes = await generateChanges(payload, branch, task, diff)
    if (!changes) {
      return respond(
        { error: "Failed to generate changes from merge request" },
        502
      )
    }

    // 4. Resolve the "Done" status (SQLite-safe, case-insensitive in JS).
    const statuses = await prisma.taskStatus.findMany({
      orderBy: { order: "desc" },
    })
    const doneStatus =
      statuses.find((s) => DONE_STATUS_NAMES.includes(s.name.trim().toLowerCase())) ??
      statuses[0]

    // Delete GitHub branch if assigned to the task
    if (task.githubBranchName && project.githubRepo) {
      try {
        await deleteGithubBranch(project.githubRepo, task.githubBranchName)
      } catch (error) {
        console.error("Error deleting GitHub branch during merge-request:", error)
      }
    }

    // 5. Save the changes and move the task to Done.
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        changes,
        ...(doneStatus ? { statusId: doneStatus.id } : {}),
      },
    })

    console.log(
      `[Merge Request] Task ${task.key || task.id} updated with changes and moved to "${doneStatus?.name ?? "(unchanged)"}" for branch "${branch}"`
    )

    return respond({
      message: "Task updated",
      taskId: updated.id,
      taskKey: updated.key,
      branch,
      newStatus: doneStatus?.name ?? null,
    })
  } catch (error) {
    console.error("Error handling merge-request webhook:", error)
    return respond({ error: "Internal server error" }, 500)
  }
}
