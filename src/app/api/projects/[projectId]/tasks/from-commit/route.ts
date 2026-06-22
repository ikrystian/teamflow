import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createTasksFromCommits } from "@/lib/commit-task"
import type { Session } from "next-auth"

// Match a public GitHub commit URL and capture the "owner/repo" slug.
const COMMIT_URL_RE = /github\.com\/([^/\s]+\/[^/\s]+)\/commit\/[0-9a-fA-F]{7,40}/

function parseRepository(url: string): string | null {
  const match = url.match(COMMIT_URL_RE)
  return match ? match[1] : null
}

// POST /api/projects/[projectId]/tasks/from-commit
// Create a task from a manually pasted GitHub commit URL, using the exact same
// AI-driven flow as the external `/api/webhook-commit` endpoint. Accepts either
// a single `commitUrl` or a `commits` array; the task is owned by the caller.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Mirror the access check used by the project task endpoints.
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          {},
          { members: { some: { userId: session.user.id } } },
          { createdById: session.user.id },
        ],
      },
      select: { id: true, githubRepo: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const commitUrl = typeof body?.commitUrl === "string" ? body.commitUrl.trim() : ""
    const commits: string[] = Array.isArray(body?.commits)
      ? body.commits.filter((c: unknown): c is string => typeof c === "string").map((c: string) => c.trim())
      : commitUrl
        ? [commitUrl]
        : []

    if (commits.length === 0) {
      return NextResponse.json(
        { error: "Podaj URL commita z GitHuba" },
        { status: 400 }
      )
    }

    const invalid = commits.find((url) => !parseRepository(url))
    if (invalid) {
      return NextResponse.json(
        { error: "Nieprawidłowy URL commita GitHub (oczekiwano https://github.com/owner/repo/commit/<sha>)" },
        { status: 400 }
      )
    }

    const repository = project.githubRepo || parseRepository(commits[0]) || ""

    const result = await createTasksFromCommits({
      projectId,
      commits,
      repository,
      branch: "",
      ownerId: session.user.id,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ task: result.task }, { status: 201 })
  } catch (error) {
    console.error("Error creating task from commit:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
