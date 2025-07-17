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
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const projectId = searchParams.get("projectId")
    const userId = searchParams.get("userId")
    const teamId = searchParams.get("teamId")

    // Build where clause for filtering
    const whereClause: Prisma.TimeEntryWhereInput = {
      task: {
        project: {
          team: {
            members: {
              some: {
                id: session.user.id
              }
            }
          }
        }
      }
    }

    // Add date filters
    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) {
        whereClause.date.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate)
      }
    }

    // Add project filter
    if (projectId) {
      whereClause.task.projectId = projectId
    }

    // Add user filter
    if (userId) {
      whereClause.userId = userId
    }

    // Add team filter
    if (teamId) {
      whereClause.task.project.teamId = teamId
    }

    // Fetch time entries with related data
    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            estimatedHours: true,
            project: {
              select: {
                id: true,
                name: true,
                team: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: "desc"
      }
    })

    // Calculate aggregated data
    const userStats = new Map()
    const projectStats = new Map()
    const dailyStats = new Map()
    let totalHours = 0

    timeEntries.forEach(entry => {
      totalHours += entry.hours

      // User statistics
      const userId = entry.user.id
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          user: entry.user,
          totalHours: 0,
          entriesCount: 0,
          projects: new Set()
        })
      }
      const userStat = userStats.get(userId)
      userStat.totalHours += entry.hours
      userStat.entriesCount += 1
      userStat.projects.add(entry.task.project.name)

      // Project statistics
      const projectId = entry.task.project.id
      if (!projectStats.has(projectId)) {
        projectStats.set(projectId, {
          project: entry.task.project,
          totalHours: 0,
          entriesCount: 0,
          users: new Set()
        })
      }
      const projectStat = projectStats.get(projectId)
      projectStat.totalHours += entry.hours
      projectStat.entriesCount += 1
      projectStat.users.add(entry.user.name)

      // Daily statistics
      const dateKey = entry.date.toISOString().split('T')[0]
      if (!dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, {
          date: dateKey,
          totalHours: 0,
          entriesCount: 0,
          users: new Set()
        })
      }
      const dailyStat = dailyStats.get(dateKey)
      dailyStat.totalHours += entry.hours
      dailyStat.entriesCount += 1
      dailyStat.users.add(entry.user.name)
    })

    // Convert Maps to Arrays and format data
    const userStatsArray = Array.from(userStats.values()).map(stat => ({
      ...stat,
      projects: Array.from(stat.projects),
      averageHoursPerDay: stat.totalHours / Math.max(1, dailyStats.size)
    }))

    const projectStatsArray = Array.from(projectStats.values()).map(stat => ({
      ...stat,
      users: Array.from(stat.users),
      averageHoursPerEntry: stat.totalHours / Math.max(1, stat.entriesCount)
    }))

    const dailyStatsArray = Array.from(dailyStats.values()).map(stat => ({
      ...stat,
      users: Array.from(stat.users),
      averageHoursPerUser: stat.totalHours / Math.max(1, stat.users.size)
    })).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      summary: {
        totalHours,
        totalEntries: timeEntries.length,
        uniqueUsers: userStats.size,
        uniqueProjects: projectStats.size,
        dateRange: {
          start: startDate,
          end: endDate
        }
      },
      userStats: userStatsArray,
      projectStats: projectStatsArray,
      dailyStats: dailyStatsArray,
      timeEntries: timeEntries.slice(0, 100) // Limit for performance
    })
  } catch (error) {
    console.error("Error fetching time tracking report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
