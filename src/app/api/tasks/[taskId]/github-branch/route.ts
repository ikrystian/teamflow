import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createGithubBranch, slugifyBranchName } from "@/lib/github"
import type { Session } from "next-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params

    // Fetch task (supports both key and id)
    const task = await prisma.task.findFirst({
      where: { OR: [{ key: taskId }, { id: taskId }] },
      include: {
        project: {
          select: { id: true, name: true, githubRepo: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (!task.project?.githubRepo) {
      return NextResponse.json(
        { error: "Ten projekt nie ma skonfigurowanego repozytorium GitHub. Skonfiguruj je w ustawieniach projektu." },
        { status: 400 }
      )
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GITHUB_TOKEN nie jest skonfigurowany na serwerze." },
        { status: 500 }
      )
    }

    // Build branch name: feature/<task-key>-<slugified-title>
    // e.g. feature/ps-12-fix-user-authentication
    const keyPart = task.key || task.id.slice(0, 8)
    const titlePart = slugifyBranchName(task.title)
    const branchName = `feature/${keyPart.toLowerCase()}-${titlePart}`

    const { branchName: createdBranchName, url } = await createGithubBranch(
      task.project.githubRepo,
      branchName
    )

    // Save branch name on the task
    await prisma.task.update({
      where: { id: task.id },
      data: { githubBranchName: createdBranchName }
    })

    return NextResponse.json({ branchName: createdBranchName, url })
  } catch (error) {
    console.error("Error creating GitHub branch:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
