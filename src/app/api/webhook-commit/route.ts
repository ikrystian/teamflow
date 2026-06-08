import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createTaskWithKey } from "@/lib/task-key"

interface WebhookCommitPayload {
  repository: string
  branch: string
  pusher: string
  projectId: string
  before: string
  after: string
  commits: string[]
}

interface GeneratedTask {
  title: string
  description: string
  changes: string
  workHours: number
}

// A per-commit generated task paired with the commit it came from.
interface CommitTask extends GeneratedTask {
  url: string
}

// The aggregated overview for the main task when there are multiple commits.
interface MainTask {
  title: string
  description: string
  changes: string
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODEL = "deepseek/deepseek-v4-flash"

// Map known pushers to the user that should own the generated tasks.
const PUSHER_USER_MAP: Record<string, string> = {
  ikrystian: "cmq52nknm0005fyk3n94mm0z6",
}

// Convert a public GitHub commit URL into raw diff content so the model has
// the actual changes to reason about. Falls back to null on any failure.
async function fetchCommitContent(commitUrl: string): Promise<string | null> {
  try {
    // https://github.com/owner/repo/commit/<sha> -> append .diff for the raw patch
    const diffUrl = commitUrl.endsWith(".diff") ? commitUrl : `${commitUrl}.diff`

    const res = await fetch(diffUrl, {
      headers: {
        Accept: "application/vnd.github.v3.diff, text/plain",
        "User-Agent": "Nexus-Webhook",
      },
    })

    if (!res.ok) {
      console.error(`Failed to fetch commit diff (${res.status}): ${diffUrl}`)
      return null
    }

    const text = await res.text()
    // Keep the payload to the model bounded.
    return text.slice(0, 12000)
  } catch (error) {
    console.error("Error fetching commit content:", error)
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

// Ask the model to derive the task that a single commit was most likely
// resolving, returned as structured JSON.
async function generateTaskFromCommit(
  payload: WebhookCommitPayload,
  commitUrl: string,
  commitContent: string
): Promise<GeneratedTask | null> {
  const systemPrompt =
    "You are an assistant that analyzes a git commit diff and infers the task " +
    "that the commit was most likely resolving. Respond ONLY with a JSON object " +
    'of the shape {"title": string, "description": string, "changes": string, ' +
    '"workHours": number}. ' +
    "The title is a short task name. The description explains the problem/feature " +
    "the commit addresses. The changes field is a description, based on the actual " +
    "code, of what was changed/done in this commit. It will be sent to Slack, so " +
    "format it using Slack mrkdwn with basic formatting: a bullet list where each " +
    "line starts with a relevant emoji (e.g. '• ✨ ...', '• 🐛 ...', '• ♻️ ...'), " +
    "use *bold* for emphasis and `code` for identifiers. Do NOT use standard " +
    "markdown like ** or # headings. " +
    "The workHours field is a realistic estimate, in hours (a number, may be " +
    "fractional), of how long it would potentially take to code this task from " +
    "scratch, accounting for analysis and testing. " +
    "Write the title, description and changes in Polish."

  const userPrompt =
    `Repository: ${payload.repository}\n` +
    `Branch: ${payload.branch}\n` +
    `Pusher: ${payload.pusher}\n\n` +
    `Based on the following commit changes, generate the task that could have ` +
    `been solved before this commit:\n\n` +
    `Commit: ${commitUrl}\n${commitContent}`

  const parsed = await callOpenRouterJson(systemPrompt, userPrompt)

  if (!parsed || typeof parsed.title !== "string" || !parsed.title) {
    console.error("Generated task missing title")
    return null
  }

  const workHours = Number(parsed.workHours)

  return {
    title: parsed.title,
    description: typeof parsed.description === "string" ? parsed.description : "",
    changes: typeof parsed.changes === "string" ? parsed.changes : "",
    workHours: Number.isFinite(workHours) && workHours > 0 ? workHours : 0,
  }
}

// Ask the model to synthesize a single coherent overview (title, description,
// merged changes) covering all of the per-commit tasks.
async function synthesizeMainTask(
  payload: WebhookCommitPayload,
  commitTasks: CommitTask[]
): Promise<MainTask | null> {
  const systemPrompt =
    "You are an assistant that summarizes multiple git commit tasks into a single " +
    "overarching task. Respond ONLY with a JSON object of the shape " +
    '{"title": string, "description": string, "changes": string}. ' +
    "The title is a short name that captures all of the commits together. The " +
    "description explains, as a whole, the problem/feature that all commits address. " +
    "The changes field merges the changes of all commits into one list. It will be " +
    "sent to Slack, so format it using Slack mrkdwn with basic formatting: a bullet " +
    "list where each line starts with a relevant emoji (e.g. '• ✨ ...', '• 🐛 ...', " +
    "'• ♻️ ...'), use *bold* for emphasis and `code` for identifiers. Do NOT use " +
    "standard markdown like ** or # headings. " +
    "Write the title, description and changes in Polish."

  const tasksBlock = commitTasks
    .map(
      (t, i) =>
        `Commit ${i + 1} (${t.url}):\n` +
        `Tytuł: ${t.title}\n` +
        `Opis: ${t.description}\n` +
        `Zmiany:\n${t.changes}`
    )
    .join("\n\n---\n\n")

  const userPrompt =
    `Repository: ${payload.repository}\n` +
    `Branch: ${payload.branch}\n\n` +
    `Summarize the following per-commit tasks into one overarching task:\n\n${tasksBlock}`

  const parsed = await callOpenRouterJson(systemPrompt, userPrompt)

  if (!parsed || typeof parsed.title !== "string" || !parsed.title) {
    console.error("Synthesized main task missing title")
    return null
  }

  return {
    title: parsed.title,
    description: typeof parsed.description === "string" ? parsed.description : "",
    changes: typeof parsed.changes === "string" ? parsed.changes : "",
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as WebhookCommitPayload

    if (!payload?.projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(payload.commits) || payload.commits.length === 0) {
      return NextResponse.json(
        { error: "commits array is required" },
        { status: 400 }
      )
    }

    // Ensure the target project exists before doing any expensive work.
    const project = await prisma.project.findUnique({
      where: { id: payload.projectId },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // For each commit URL: fetch its diff and ask the model to derive a task.
    const commitTasks: CommitTask[] = []
    for (const commitUrl of payload.commits) {
      const content = await fetchCommitContent(commitUrl)
      if (!content) continue

      const generated = await generateTaskFromCommit(payload, commitUrl, content)
      if (generated) {
        commitTasks.push({ ...generated, url: commitUrl })
      }
    }

    if (commitTasks.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate task from commits" },
        { status: 502 }
      )
    }

    // Use the global default status if one is configured.
    const defaultStatus = await prisma.taskStatus.findFirst({
      where: { isDefault: true },
    })

    // Resolve the owning user from the pusher, if it maps to a known user.
    const ownerId = PUSHER_USER_MAP[payload.pusher] ?? null

    // Single commit -> a single task, no todos.
    if (commitTasks.length === 1) {
      const single = commitTasks[0]
      const task = await createTaskWithKey(prisma, payload.projectId, (key) => prisma.task.create({
        data: {
          key,
          title: single.title,
          description: single.description,
          changes: single.changes || null,
          estimatedHours: single.workHours > 0 ? single.workHours : null,
          projectId: payload.projectId,
          statusId: defaultStatus?.id ?? null,
          assigneeId: ownerId,
          createdById: ownerId,
        },
      }))

      return NextResponse.json({ task }, { status: 201 })
    }

    // Multiple commits -> one main task with the per-commit tasks stored as todos.
    const main = await synthesizeMainTask(payload, commitTasks)

    if (!main) {
      return NextResponse.json(
        { error: "Failed to synthesize main task" },
        { status: 502 }
      )
    }

    // The main task's estimate is the sum of the todos' time.
    const totalHours = commitTasks.reduce((sum, t) => sum + t.workHours, 0)

    const task = await createTaskWithKey(prisma, payload.projectId, (key) => prisma.task.create({
      data: {
        key,
        title: main.title,
        description: main.description,
        changes: main.changes || null,
        estimatedHours: totalHours > 0 ? totalHours : null,
        projectId: payload.projectId,
        statusId: defaultStatus?.id ?? null,
        assigneeId: ownerId,
        createdById: ownerId,
        todos: {
          create: commitTasks.map((t) => ({
            title: t.title,
            timeSpent: t.workHours > 0 ? t.workHours : null,
          })),
        },
      },
      include: {
        todos: true,
      },
    }))

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("Error handling commit webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
