import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "all" // all, month, week

    // Calculate date range based on timeRange parameter
    let dateFilter = {}
    const now = new Date()

    if (timeRange === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFilter = { gte: weekAgo }
    } else if (timeRange === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      dateFilter = { gte: monthAgo }
    }

    // Base filter to ensure user has access to the data. Also excludes
    // soft-deleted tasks from every stat (and time/comment aggregates that
    // join through the task relation).
    const accessFilter = {
      deletedAt: null,
      project: {

      }
    }

    // Get task statistics
    const taskStats = await prisma.task.groupBy({
      by: ['statusId'],
      where: {
        assigneeId: userId,
        ...accessFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      _count: {
        id: true
      }
    })

    // Get priority distribution
    const priorityStats = await prisma.task.groupBy({
      by: ['priority'],
      where: {
        assigneeId: userId,
        ...accessFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      _count: {
        id: true
      }
    })

    // Get time tracking statistics
    const timeStats = await prisma.timeEntry.aggregate({
      where: {
        userId: userId,
        task: accessFilter,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      _sum: {
        hours: true
      },
      _count: {
        id: true
      },
      _avg: {
        hours: true
      }
    })

    // Get daily time tracking for the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const dailyTimeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        task: accessFilter,
        date: { gte: thirtyDaysAgo }
      },
      select: {
        date: true,
        hours: true
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Group daily time entries by date
    const dailyHours = dailyTimeEntries.reduce((acc, entry) => {
      const dateKey = entry.date.toISOString().split('T')[0]
      acc[dateKey] = (acc[dateKey] || 0) + entry.hours
      return acc
    }, {} as Record<string, number>)

    // Get project involvement
    const projectStats = await prisma.task.groupBy({
      by: ['projectId'],
      where: {
        assigneeId: userId,
        ...accessFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      _count: {
        id: true
      },
      _sum: {
        estimatedHours: true
      }
    })

    // Get project details for the stats (filter out null project IDs)
    const projectIds = projectStats.map(stat => stat.projectId).filter((id): id is string => id !== null)
    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
      },
      select: {
        id: true,
        name: true,

      }
    })

    // Combine project stats with project details
    const projectStatsWithDetails = projectStats.map(stat => {
      const project = projects.find(p => p.id === stat.projectId)
      return {
        project,
        taskCount: stat._count.id,
        estimatedHours: stat._sum.estimatedHours || 0
      }
    }).filter(stat => stat.project) // Remove projects that user doesn't have access to

    // Get recent activity (comments and task updates)
    const recentComments = await prisma.comment.count({
      where: {
        authorId: userId,
        task: accessFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    })

    const recentTasksCreated = await prisma.task.count({
      where: {
        createdById: userId,
        ...accessFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    })

    // Calculate completion rate
    const totalTasks = taskStats.reduce((sum, stat) => sum + stat._count.id, 0)
    // Get the "Done" status ID first
    const doneStatus = await prisma.taskStatus.findFirst({
      where: { name: 'Done' }
    })
    const completedTasks = taskStats.find(stat => stat.statusId === doneStatus?.id)?._count.id || 0
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Format response
    const stats = {
      summary: {
        totalTasks,
        completedTasks,
        completionRate,
        totalHours: timeStats._sum.hours || 0,
        averageHoursPerEntry: timeStats._avg.hours || 0,
        totalTimeEntries: timeStats._count.id,
        recentComments,
        recentTasksCreated,
        projectsCount: projectStatsWithDetails.length
      },
      tasksByStatus: await Promise.all(taskStats.map(async (stat) => {
        const status = await prisma.taskStatus.findUnique({
          where: { id: stat.statusId || '' }
        })
        return {
          status: status?.name || 'No Status',
          count: stat._count.id
        }
      })),
      tasksByPriority: priorityStats.map(stat => ({
        priority: stat.priority || 'None',
        count: stat._count.id
      })),
      projectInvolvement: projectStatsWithDetails,
      dailyHours: Object.entries(dailyHours).map(([date, hours]) => ({
        date,
        hours
      })),
      timeRange,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
