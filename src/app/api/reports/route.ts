import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"
import type { Prisma } from "@prisma/client"

type TaskWithIncludes = Prisma.TaskGetPayload<{
  include: {
    taskStatus: true
    project: true
    timeEntries: true
    assignee: {
      select: {
        id: true
        name: true
        email: true
        avatarUrl: true
      }
    }
  }
}>

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "month" // week, month, quarter, year, custom
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Calculate date range
    let dateFilter = {}
    const now = new Date()

    if (timeRange === "custom" && startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } else if (timeRange === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFilter = { gte: weekAgo }
    } else if (timeRange === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      dateFilter = { gte: monthAgo }
    } else if (timeRange === "quarter") {
      const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      dateFilter = { gte: quarterAgo }
    } else if (timeRange === "year") {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      dateFilter = { gte: yearAgo }
    }

    // Get all tasks with time entries for the current user
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: session.user.id,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      include: {
        taskStatus: true,
        project: true,
        timeEntries: {
          where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate total hours from time entries
    const totalHours = tasks.reduce((sum: number, task: TaskWithIncludes) => {
      const taskHours = task.timeEntries.reduce((taskSum: number, entry) => taskSum + entry.hours, 0)
      return sum + taskHours
    }, 0)

    // Calculate total estimated hours
    const totalEstimatedHours = tasks.reduce((sum: number, task: TaskWithIncludes) => sum + (task.estimatedHours || 0), 0)

    // Count tasks by status
    const tasksByStatus = tasks.reduce((acc: Record<string, { name: string; count: number; color: string }>, task: TaskWithIncludes) => {
      const statusName = task.taskStatus?.name || 'No Status'
      const statusColor = task.taskStatus?.color || '#gray'
      if (!acc[statusName]) {
        acc[statusName] = { name: statusName, count: 0, color: statusColor }
      }
      acc[statusName].count++
      return acc
    }, {} as Record<string, { name: string; count: number; color: string }>)

    // Count tasks by priority
    const tasksByPriority = tasks.reduce((acc: Record<string, number>, task: TaskWithIncludes) => {
      const priority = task.priority || 'None'
      if (!acc[priority]) {
        acc[priority] = 0
      }
      acc[priority]++
      return acc
    }, {} as Record<string, number>)

    // Calculate hours by project
    interface ProjectStat {
      id: string
      name: string
      color: string
      totalHours: number
      estimatedHours: number
      taskCount: number
      completedTasks: number
    }

    const projectStats = tasks.reduce((acc: Record<string, ProjectStat>, task: TaskWithIncludes) => {
      // Skip tasks without a project
      if (!task.project) {
        return acc
      }

      const projectId = task.project.id
      const projectName = task.project.name
      const projectColor = task.project.color || '#3b82f6'

      if (!acc[projectId]) {
        acc[projectId] = {
          id: projectId,
          name: projectName,
          color: projectColor,
          totalHours: 0,
          estimatedHours: 0,
          taskCount: 0,
          completedTasks: 0
        }
      }

      const taskHours = task.timeEntries.reduce((sum: number, entry) => sum + entry.hours, 0)
      acc[projectId].totalHours += taskHours
      acc[projectId].estimatedHours += task.estimatedHours || 0
      acc[projectId].taskCount++

      if (task.taskStatus?.name === 'Done') {
        acc[projectId].completedTasks++
      }

      return acc
    }, {} as Record<string, ProjectStat>)

    // Calculate daily hours for chart
    const dailyHoursMap = new Map<string, number>()
    tasks.forEach((task) => {
      task.timeEntries.forEach((entry) => {
        const dateKey = entry.date.toISOString().split('T')[0]
        dailyHoursMap.set(dateKey, (dailyHoursMap.get(dateKey) || 0) + entry.hours)
      })
    })

    const dailyHours = Array.from(dailyHoursMap.entries())
      .map(([date, hours]) => ({ date, hours }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate weekly hours for chart
    const weeklyHoursMap = new Map<string, number>()
    tasks.forEach((task) => {
      task.timeEntries.forEach((entry) => {
        const date = new Date(entry.date)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekKey = weekStart.toISOString().split('T')[0]
        weeklyHoursMap.set(weekKey, (weeklyHoursMap.get(weekKey) || 0) + entry.hours)
      })
    })

    const weeklyHours = Array.from(weeklyHoursMap.entries())
      .map(([week, hours]) => ({ week, hours }))
      .sort((a, b) => a.week.localeCompare(b.week))

    // Top 10 tasks by time spent
    const tasksWithTime = tasks.map((task) => {
      const totalTime = task.timeEntries.reduce((sum: number, entry) => sum + entry.hours, 0)
      return {
        id: task.id,
        title: task.title,
        project: task.project?.name || 'No Project',
        projectColor: task.project?.color || '#3b82f6',
        status: task.taskStatus?.name || 'No Status',
        statusColor: task.taskStatus?.color || '#gray',
        totalHours: totalTime,
        estimatedHours: task.estimatedHours || 0,
        difference: totalTime - (task.estimatedHours || 0),
        priority: task.priority
      }
    }).filter((task) => task.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 10)

    // Calculate average time per task
    const tasksWithTimeCount = tasksWithTime.length
    const averageTimePerTask = tasksWithTimeCount > 0 ? totalHours / tasksWithTimeCount : 0

    // Get completion status
    const doneStatus = await prisma.taskStatus.findFirst({
      where: { name: 'Done' }
    })
    const completedTasksCount = tasks.filter((t) => t.statusId === doneStatus?.id).length
    const completionRate = tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0

    // Estimated vs Actual comparison data
    const estimatedVsActual = Object.values(projectStats).map((project) => ({
      project: project.name,
      estimated: Math.round(project.estimatedHours * 100) / 100,
      actual: Math.round(project.totalHours * 100) / 100,
      color: project.color
    }))

    // Response data
    const reportData = {
      summary: {
        totalTasks: tasks.length,
        completedTasks: completedTasksCount,
        completionRate: Math.round(completionRate * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
        averageTimePerTask: Math.round(averageTimePerTask * 100) / 100,
        timeVariance: Math.round((totalHours - totalEstimatedHours) * 100) / 100
      },
      charts: {
        tasksByStatus: Object.values(tasksByStatus),
        tasksByPriority: Object.entries(tasksByPriority).map(([priority, count]) => ({
          priority,
          count
        })),
        dailyHours,
        weeklyHours,
        estimatedVsActual
      },
      tables: {
        topTasksByTime: tasksWithTime,
        projectStats: Object.values(projectStats).map((project) => ({
          ...project,
          totalHours: Math.round(project.totalHours * 100) / 100,
          estimatedHours: Math.round(project.estimatedHours * 100) / 100,
          completionRate: project.taskCount > 0
            ? Math.round((project.completedTasks / project.taskCount) * 100 * 100) / 100
            : 0
        }))
      },
      timeRange,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
