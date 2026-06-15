import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"
import type { Prisma } from "@prisma/client"

// Paginated task listing for a single project, used by the Kanban board to load
// tasks per status column on demand (max TASKS_PER_PAGE at a time, more fetched
// while scrolling). Returns the requested slice plus the total count matching
// the filter so the column badge can show the full number of tasks even though
// only some are loaded.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Mirror the access check used by the project GET endpoint so the board sees
    // exactly the projects the user can open.
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          {},
          {
            members: {
              some: {
                userId: session.user.id
              }
            }
          },
          {
            createdById: session.user.id
          }
        ]
      },
      select: { id: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statusId = searchParams.get("statusId")
    const assigneeId = searchParams.get("assigneeId")
    const order = searchParams.get("order") === "asc" ? "asc" : "desc"

    const skipParam = parseInt(searchParams.get("skip") ?? "", 10)
    const takeParam = parseInt(searchParams.get("take") ?? "", 10)
    const skip = Number.isFinite(skipParam) && skipParam > 0 ? skipParam : 0
    // When `take` is omitted or invalid we return every matching task (used by
    // the list / daily views which still render the full set).
    const take = Number.isFinite(takeParam) && takeParam > 0 ? takeParam : undefined

    const where: Prisma.TaskWhereInput = {
      projectId,
      deletedAt: null, // hide soft-deleted tasks
      ...(statusId && { statusId }),
      ...(assigneeId && { assigneeId }),
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: {
          taskStatus: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          },
          todos: true,
          timeEntries: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true
                }
              }
            },
            orderBy: {
              date: "desc"
            }
          }
        },
        orderBy: {
          createdAt: order
        },
        skip,
        ...(take !== undefined && { take }),
      })
    ])

    // Map todos to subtasks for simpler frontend consumption. Comments are
    // intentionally omitted here to keep the per-page payload light - the board
    // cards and list/daily views don't read them (the task dialog loads its own).
    const tasksWithSubtasks = tasks.map(task => ({
      ...task,
      subtasks: task.todos,
      comments: [],
      todos: undefined
    }))

    return NextResponse.json({ tasks: tasksWithSubtasks, total })
  } catch (error) {
    console.error("Error fetching project tasks:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
