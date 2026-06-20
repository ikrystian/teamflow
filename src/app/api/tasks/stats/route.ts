import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusId = searchParams.get("statusId")
    const projectId = searchParams.get("projectId")
    const assigneeId = searchParams.get("assigneeId")

    if (!statusId) {
      return NextResponse.json({ error: "statusId is required" }, { status: 400 })
    }

    const whereClause = {
      statusId,
      deletedAt: null,
      archived: false,
      ...(projectId && { projectId }),
      ...(assigneeId && { assigneeId })
    }

    // Fetch all tasks matching the filters
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        timeEntries: true,
        todos: true,
        assignee: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    const totalTasks = tasks.length
    let totalEstimatedHours = 0
    let totalWorkedHours = 0
    let overdueTasks = 0
    const priorityBreakdown = { High: 0, Medium: 0, Low: 0 } as Record<string, number>
    const assigneeBreakdown = {} as Record<string, number>

    const now = new Date()

    tasks.forEach(task => {
      totalEstimatedHours += task.estimatedHours || 0
      
      // Calculate worked hours
      const mainHours = task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0)
      const subtaskHours = task.todos.reduce((sum, entry) => sum + (entry.timeSpent ?? 0), 0)
      totalWorkedHours += (mainHours + subtaskHours)

      // Priority
      const priority = task.priority || "Low"
      priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1

      // Overdue
      if (task.dueDate && new Date(task.dueDate) < now) {
        overdueTasks++
      }

      // Assignee
      const assigneeName = task.assignee?.name || task.assignee?.email || "Nieprzypisane"
      assigneeBreakdown[assigneeName] = (assigneeBreakdown[assigneeName] || 0) + 1
    })

    return NextResponse.json({
      totalTasks,
      totalEstimatedHours,
      totalWorkedHours,
      overdueTasks,
      priorityBreakdown,
      assigneeBreakdown
    })

  } catch (error) {
    console.error("Error fetching task statistics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
