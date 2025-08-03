import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const projectId = searchParams.get("projectId")
    const userId = searchParams.get("userId")
    const teamId = searchParams.get("teamId")
    const timeframe = searchParams.get("timeframe") || "30d"

    // Calculate date range
    const endDateTime = endDate ? new Date(endDate) : new Date()
    const startDateTime = startDate 
      ? new Date(startDate) 
      : subDays(endDateTime, timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30)

    // Build filters
    const filters: any = {
      createdAt: {
        gte: startOfDay(startDateTime),
        lte: endOfDay(endDateTime)
      }
    }

    if (projectId && projectId !== "all") {
      filters.projectId = projectId
    }

    if (userId && userId !== "all") {
      filters.assigneeId = userId
    }

    if (teamId && teamId !== "all") {
      filters.project = {
        teamId: teamId
      }
    }

    // Fetch basic statistics
    const [
      totalTasks,
      completedTasks,
      overdueTasks, 
      inProgressTasks,
      totalProjects,
      activeUsers,
      timeEntries
    ] = await Promise.all([
      prisma.task.count({ where: filters }),
      prisma.task.count({ 
        where: { 
          ...filters, 
          taskStatus: { name: "Done" }
        } 
      }),
      prisma.task.count({
        where: {
          ...filters,
          dueDate: { lt: new Date() },
          taskStatus: { NOT: { name: "Done" } }
        }
      }),
      prisma.task.count({
        where: {
          ...filters,
          taskStatus: { name: "In Progress" }
        }
      }),
      prisma.project.count({
        where: {
          archived: false,
          ...(teamId && teamId !== "all" ? { teamId } : {})
        }
      }),
      prisma.user.count({
        where: {
          tasks: {
            some: {
              updatedAt: {
                gte: subDays(new Date(), 7)
              }
            }
          }
        }
      }),
      prisma.timeEntry.findMany({
        where: {
          createdAt: {
            gte: startOfDay(startDateTime),
            lte: endOfDay(endDateTime)
          },
          ...(projectId && projectId !== "all" ? {
            task: { projectId }
          } : {}),
          ...(userId && userId !== "all" ? { userId } : {}),
        },
        include: {
          task: {
            include: {
              project: true
            }
          },
          user: true
        }
      })
    ])

    // Calculate KPIs
    const totalTimeLogged = timeEntries.reduce((sum, entry) => sum + entry.hours, 0)
    const avgTaskCompletionTime = completedTasks > 0 ? 5.2 : 0 // Mock calculation
    const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const teamEfficiency = Math.min(100, Math.round((productivityScore + (totalTimeLogged / 100)) / 2))

    // Generate trends data
    const dateRange = eachDayOfInterval({ start: startDateTime, end: endDateTime })
    const trendsData = await Promise.all(
      dateRange.map(async (date) => {
        const dayStart = startOfDay(date)
        const dayEnd = endOfDay(date)
        
        const [tasksCreated, tasksCompleted, dayTimeEntries] = await Promise.all([
          prisma.task.count({
            where: {
              ...filters,
              createdAt: { gte: dayStart, lte: dayEnd }
            }
          }),
          prisma.task.count({
            where: {
              ...filters,
              updatedAt: { gte: dayStart, lte: dayEnd },
              taskStatus: { name: "Done" }
            }
          }),
          prisma.timeEntry.findMany({
            where: {
              createdAt: { gte: dayStart, lte: dayEnd },
              ...(projectId && projectId !== "all" ? {
                task: { projectId }
              } : {}),
              ...(userId && userId !== "all" ? { userId } : {})
            }
          })
        ])

        const dayHours = dayTimeEntries.reduce((sum, entry) => sum + entry.hours, 0)
        
        return {
          date: format(date, 'yyyy-MM-dd'),
          tasksCreated,
          tasksCompleted,
          timeLogged: dayHours,
          productivity: tasksCompleted > 0 ? Math.min(100, Math.round((tasksCompleted / Math.max(tasksCreated, 1)) * 100)) : 0
        }
      })
    )

    // Project distribution
    const projects = await prisma.project.findMany({
      where: {
        archived: false,
        ...(teamId && teamId !== "all" ? { teamId } : {})
      },
      include: {
        tasks: {
          where: filters,
          include: {
            timeEntries: true,
            taskStatus: true
          }
        }
      }
    })

    const projectDistribution = projects.map(project => ({
      project: project.name,
      tasks: project.tasks.length,
      completed: project.tasks.filter(t => t.taskStatus?.name === "Done").length,
      hours: project.tasks.reduce((sum, task) => 
        sum + task.timeEntries.reduce((timeSum, entry) => timeSum + entry.hours, 0), 0
      ),
      color: project.color || '#3B82F6'
    }))

    // User performance
    const users = await prisma.user.findMany({
      include: {
        tasks: {
          where: filters,
          include: {
            timeEntries: true,
            taskStatus: true
          }
        }
      }
    })

    const userPerformance = users
      .filter(user => user.tasks.length > 0)
      .map(user => ({
        user: user.name || user.email,
        completedTasks: user.tasks.filter(t => t.taskStatus?.name === "Done").length,
        hoursLogged: user.tasks.reduce((sum, task) => 
          sum + task.timeEntries.reduce((timeSum, entry) => timeSum + entry.hours, 0), 0
        ),
        efficiency: user.tasks.length > 0 ? 
          Math.round((user.tasks.filter(t => t.taskStatus?.name === "Done").length / user.tasks.length) * 100) : 0,
        avatar: user.avatarUrl
      }))
      .sort((a, b) => b.completedTasks - a.completedTasks)
      .slice(0, 10)

    // Task status distribution
    const taskStatuses = await prisma.taskStatus.findMany({
      include: {
        tasks: {
          where: filters
        }
      }
    })

    const taskStatusDistribution = taskStatuses
      .filter(status => status.tasks.length > 0)
      .map(status => ({
        status: status.name,
        count: status.tasks.length,
        percentage: Math.round((status.tasks.length / totalTasks) * 100),
        color: status.color || '#64748B'
      }))

    // Priority distribution
    const priorities = ['High', 'Medium', 'Low']
    const priorityDistribution = await Promise.all(
      priorities.map(async (priority) => {
        const count = await prisma.task.count({
          where: { ...filters, priority }
        })
        return {
          priority,
          count,
          color: priority === 'High' ? '#EF4444' : 
                priority === 'Medium' ? '#F59E0B' : '#10B981'
        }
      })
    )

    // Burndown data (mock for now)
    const burndownData = dateRange.map((date, index) => ({
      date: format(date, 'yyyy-MM-dd'),
      planned: Math.max(0, totalTasks - (index * 2)),
      actual: Math.max(0, totalTasks - completedTasks),
      ideal: Math.max(0, totalTasks - Math.round((index / dateRange.length) * totalTasks))
    }))

    const dashboardData = {
      kpis: {
        totalTasks,
        completedTasks,
        overdueTasks,
        inProgressTasks,
        totalProjects,
        activeUsers,
        totalTimeLogged: totalTimeLogged, // Already in hours
        avgTaskCompletionTime,
        productivityScore,
        teamEfficiency
      },
      trends: {
        tasksCreated: trendsData.map(d => ({ date: d.date, count: d.tasksCreated })),
        tasksCompleted: trendsData.map(d => ({ date: d.date, count: d.tasksCompleted })),
        timeLogged: trendsData.map(d => ({ date: d.date, hours: d.timeLogged })),
        productivity: trendsData.map(d => ({ date: d.date, score: d.productivity }))
      },
      projectDistribution,
      userPerformance,
      taskStatusDistribution,
      priorityDistribution: priorityDistribution.filter(p => p.count > 0),
      burndownData
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error("Error fetching dashboard overview:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}