import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const teamId = searchParams.get("teamId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build where clause for projects
    const projectWhereClause: Prisma.ProjectWhereInput = {
      team: {
        members: {
          some: {
            id: session.user.id
          }
        }
      }
    }

    if (projectId) {
      projectWhereClause.id = projectId
    }

    if (teamId) {
      projectWhereClause.teamId = teamId
    }

    // Fetch projects with tasks and time entries
    const projects = await prisma.project.findMany({
      where: projectWhereClause,
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            },
            taskStatus: {
              select: {
                id: true,
                name: true
              }
            },
            timeEntries: {
              where: {
                ...(startDate && { date: { gte: new Date(startDate) } }),
                ...(endDate && { date: { lte: new Date(endDate) } })
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Calculate project statistics
    const projectReports = projects.map(project => {
      const tasks = project.tasks
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(task => task.taskStatus?.name === "Done").length
      const inProgressTasks = tasks.filter(task => task.taskStatus?.name === "In Progress").length
      const todoTasks = tasks.filter(task => task.taskStatus?.name === "To Do").length

      // Calculate time statistics
      let totalLoggedHours = 0
      let totalEstimatedHours = 0
      const userHours = new Map()

      tasks.forEach(task => {
        if (task.estimatedHours) {
          totalEstimatedHours += task.estimatedHours
        }

        task.timeEntries.forEach(entry => {
          totalLoggedHours += entry.hours

          const userId = entry.user.id
          if (!userHours.has(userId)) {
            userHours.set(userId, {
              user: entry.user,
              hours: 0,
              tasksWorkedOn: new Set()
            })
          }
          userHours.get(userId).hours += entry.hours
          userHours.get(userId).tasksWorkedOn.add(task.id)
        })
      })

      // Calculate overdue tasks
      const now = new Date()
      const overdueTasks = tasks.filter(task =>
        task.dueDate &&
        new Date(task.dueDate) < now &&
        task.taskStatus?.name !== "Done"
      ).length

      // Calculate due soon tasks (next 7 days)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const dueSoonTasks = tasks.filter(task =>
        task.dueDate &&
        new Date(task.dueDate) >= now &&
        new Date(task.dueDate) <= nextWeek &&
        task.taskStatus?.name !== "Done"
      ).length

      // Task status distribution
      const statusDistribution = {
        "To Do": todoTasks,
        "In Progress": inProgressTasks,
        "Done": completedTasks
      }

      // Priority distribution
      const priorityDistribution = tasks.reduce((acc, task) => {
        const priority = task.priority || "None"
        acc[priority] = (acc[priority] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // User contributions
      const userContributions = Array.from(userHours.values()).map(userStat => ({
        user: userStat.user,
        hours: userStat.hours,
        tasksWorkedOn: userStat.tasksWorkedOn.size,
        percentage: totalLoggedHours > 0 ? (userStat.hours / totalLoggedHours) * 100 : 0
      }))

      return {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,

          team: project.team
        },
        taskStats: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          todo: todoTasks,
          overdue: overdueTasks,
          dueSoon: dueSoonTasks,
          completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
        },
        timeStats: {
          totalLoggedHours,
          totalEstimatedHours,
          efficiency: totalEstimatedHours > 0 ? (totalLoggedHours / totalEstimatedHours) * 100 : 0,
          averageHoursPerTask: totalTasks > 0 ? totalLoggedHours / totalTasks : 0
        },
        distributions: {
          status: statusDistribution,
          priority: priorityDistribution
        },
        userContributions,
        recentActivity: tasks
          .flatMap(task => task.timeEntries)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10)
      }
    })

    // Calculate overall statistics
    const overallStats = {
      totalProjects: projects.length,
      totalTasks: projectReports.reduce((sum, p) => sum + p.taskStats.total, 0),
      totalCompletedTasks: projectReports.reduce((sum, p) => sum + p.taskStats.completed, 0),
      totalLoggedHours: projectReports.reduce((sum, p) => sum + p.timeStats.totalLoggedHours, 0),
      totalEstimatedHours: projectReports.reduce((sum, p) => sum + p.timeStats.totalEstimatedHours, 0),
      averageCompletionRate: projectReports.length > 0
        ? projectReports.reduce((sum, p) => sum + p.taskStats.completionRate, 0) / projectReports.length
        : 0
    }

    return NextResponse.json({
      overallStats,
      projectReports,
      filters: {
        projectId,
        teamId,
        startDate,
        endDate
      }
    })
  } catch (error) {
    console.error("Error fetching project progress report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
