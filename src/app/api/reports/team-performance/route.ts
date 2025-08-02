import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next" 
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays, format, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns"

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
    const comparisonPeriod = searchParams.get("comparisonPeriod") || "3m"

    // Calculate date range
    const endDateTime = endDate ? new Date(endDate) : new Date()
    const startDateTime = startDate 
      ? new Date(startDate) 
      : subDays(endDateTime, comparisonPeriod === "1m" ? 30 : comparisonPeriod === "6m" ? 180 : 90)

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

    if (teamId && teamId !== "all") {
      filters.project = {
        teamId: teamId
      }
    }

    // Get team members
    const teamMembers = await prisma.user.findMany({
      where: {
        tasks: {
          some: {
            createdAt: {
              gte: startOfDay(startDateTime),
              lte: endOfDay(endDateTime)
            }
          }
        }
      },
      include: {
        tasks: {
          where: filters,
          include: {
            timeEntries: true,
            comments: true
          }
        },
        timeEntries: {
          where: {
            createdAt: {
              gte: startOfDay(startDateTime), 
              lte: endOfDay(endDateTime)
            }
          }
        }
      }
    })

    // Calculate team overview
    const totalMembers = teamMembers.length
    const activeMembers = teamMembers.filter(member => 
      member.tasks.some(task => 
        task.updatedAt >= subDays(new Date(), 7)
      )
    ).length

    const totalTasksCompleted = teamMembers.reduce((sum, member) => 
      sum + member.tasks.filter(task => task.status?.name === "Done").length, 0
    )

    const totalHoursLogged = teamMembers.reduce((sum, member) => 
      sum + member.timeEntries.reduce((timeSum, entry) => timeSum + entry.duration, 0), 0
    )

    const averageProductivity = totalMembers > 0 ? 
      teamMembers.reduce((sum, member) => {
        const memberTasks = member.tasks.length
        const memberCompleted = member.tasks.filter(task => task.status?.name === "Done").length
        return sum + (memberTasks > 0 ? (memberCompleted / memberTasks) * 100 : 0)
      }, 0) / totalMembers : 0

    const teamVelocity = Math.round(totalTasksCompleted / Math.max(1, 
      Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (7 * 24 * 60 * 60 * 1000))
    ))

    // Generate member performance data
    const memberPerformance = teamMembers.map(member => {
      const tasksCompleted = member.tasks.filter(task => task.status?.name === "Done").length
      const totalTasks = member.tasks.length
      const hoursLogged = member.timeEntries.reduce((sum, entry) => sum + entry.duration, 0)
      
      const productivity = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0
      const velocity = Math.round(tasksCompleted / Math.max(1, 
        Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (7 * 24 * 60 * 60 * 1000))
      ))
      
      // Mock quality and collaboration scores (in real app, calculate from reviews, bug reports, etc.)
      const quality = Math.min(100, Math.max(60, productivity + Math.random() * 20 - 10))
      const collaboration = Math.min(100, Math.max(50, 
        member.tasks.reduce((sum, task) => sum + task.comments.length, 0) * 5 + Math.random() * 30
      ))
      
      const consistency = Math.min(100, Math.max(40, productivity + Math.random() * 40 - 20))
      const onTimeDelivery = Math.min(100, Math.max(50, 
        member.tasks.filter(task => 
          !task.dueDate || (task.updatedAt <= new Date(task.dueDate))
        ).length / Math.max(1, member.tasks.length) * 100
      ))

      // Generate weekly progress
      const weeks = eachWeekOfInterval({ start: startDateTime, end: endDateTime })
      const weeklyProgress = weeks.map(week => {
        const weekStart = startOfWeek(week)
        const weekEnd = endOfWeek(week)
        
        const weekTasks = member.tasks.filter(task => 
          task.updatedAt >= weekStart && task.updatedAt <= weekEnd &&
          task.status?.name === "Done"
        ).length
        
        const weekHours = member.timeEntries.filter(entry =>
          entry.createdAt >= weekStart && entry.createdAt <= weekEnd
        ).reduce((sum, entry) => sum + entry.duration, 0)

        return {
          week: format(week, 'yyyy-MM-dd'),
          tasks: weekTasks,
          hours: weekHours / 3600
        }
      })

      // Generate productivity trend (daily)
      const productivityTrend = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(endDateTime, 29 - i)
        const dayScore = Math.min(100, Math.max(0, productivity + (Math.random() * 40 - 20)))
        return {
          date: format(date, 'yyyy-MM-dd'),
          score: Math.round(dayScore)
        }
      })

      // Generate strengths and improvement areas
      const strengths = []
      const improvementAreas = []

      if (productivity >= 80) strengths.push("Wysoka produktywność w realizacji zadań")
      if (quality >= 85) strengths.push("Doskonała jakość wykonywanych prac")
      if (collaboration >= 75) strengths.push("Aktywne uczestnictwo w pracy zespołowej")
      if (onTimeDelivery >= 90) strengths.push("Terminowa realizacja projektów")

      if (productivity < 60) improvementAreas.push("Zwiększenie produktywności w realizacji zadań")
      if (quality < 70) improvementAreas.push("Poprawa jakości wykonywanych prac")
      if (collaboration < 60) improvementAreas.push("Większe zaangażowanie w pracę zespołową")
      if (consistency < 70) improvementAreas.push("Zwiększenie regularności w pracy")

      return {
        user: {
          id: member.id,
          name: member.name || 'Bez nazwy',
          email: member.email,
          avatarUrl: member.avatarUrl,
          role: 'Developer' // Mock - in real app get from user profile
        },
        metrics: {
          tasksCompleted,
          hoursLogged: hoursLogged / 3600,
          productivity: Math.round(productivity),
          velocity,
          quality: Math.round(quality),
          collaboration: Math.round(collaboration),
          consistency: Math.round(consistency),
          onTimeDelivery: Math.round(onTimeDelivery)
        },
        trends: {
          weeklyProgress,
          productivityTrend
        },
        strengths,
        improvementAreas
      }
    })

    // Generate team collaboration data (mock)
    const teamCollaboration = []
    for (let i = 0; i < memberPerformance.length; i++) {
      for (let j = i + 1; j < memberPerformance.length; j++) {
        const member1 = memberPerformance[i]
        const member2 = memberPerformance[j]
        
        // Mock collaboration calculation based on shared projects/tasks
        const collaborationIndex = Math.round(Math.random() * 100)
        const sharedTasks = Math.round(Math.random() * 10)
        const communicationFrequency = Math.round(Math.random() * 50)

        if (collaborationIndex > 30) { // Only include meaningful collaborations
          teamCollaboration.push({
            fromUser: member1.user.name,
            toUser: member2.user.name,
            collaborationIndex,
            sharedTasks,
            communicationFrequency
          })
        }
      }
    }

    // Generate skills matrix (mock)
    const skills = [
      'React/Frontend', 'Node.js/Backend', 'Database Design', 
      'DevOps/CI/CD', 'Project Management', 'UI/UX Design'
    ]
    
    const skillsMatrix = skills.map(skill => ({
      skill,
      members: memberPerformance.map(member => ({
        userId: member.user.id,
        userName: member.user.name,
        proficiency: Math.ceil(Math.random() * 5), // 1-5 scale
        experience: Math.round(Math.random() * 10) // years
      }))
    }))

    // Performance comparison with benchmarks (mock)
    const performanceComparison = [
      {
        metric: 'Produktywność',
        teamAverage: Math.round(averageProductivity),
        industryBenchmark: 75,
        previousPeriod: Math.round(averageProductivity * 0.9)
      },
      {
        metric: 'Jakość',
        teamAverage: Math.round(memberPerformance.reduce((sum, m) => sum + m.metrics.quality, 0) / memberPerformance.length),
        industryBenchmark: 80,
        previousPeriod: 78
      },
      {
        metric: 'Współpraca',
        teamAverage: Math.round(memberPerformance.reduce((sum, m) => sum + m.metrics.collaboration, 0) / memberPerformance.length),
        industryBenchmark: 70,
        previousPeriod: 72
      },
      {
        metric: 'Terminowość',
        teamAverage: Math.round(memberPerformance.reduce((sum, m) => sum + m.metrics.onTimeDelivery, 0) / memberPerformance.length),
        industryBenchmark: 85,
        previousPeriod: 82
      }
    ]

    // Workload analysis
    const workload = memberPerformance.map(member => ({
      user: member.user.name,
      currentLoad: Math.min(100, Math.round((member.metrics.hoursLogged / 40) * 100)), // assuming 40h/week
      capacity: 100,
      efficiency: member.metrics.productivity,
      burnoutRisk: Math.max(0, Math.min(100, 
        (member.metrics.hoursLogged > 45 ? 60 : 20) + 
        (member.metrics.productivity < 60 ? 30 : 0) +
        Math.random() * 20
      ))
    }))

    // Recent milestones (mock)
    const milestones = [
      {
        date: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
        achievement: "Ukończenie sprint 12 przed terminem",
        impact: "high" as const,
        teamMembers: memberPerformance.slice(0, 3).map(m => m.user.name)
      },
      {
        date: format(subDays(new Date(), 12), 'yyyy-MM-dd'),
        achievement: "Wdrożenie systemu automatycznych testów",
        impact: "medium" as const,
        teamMembers: memberPerformance.slice(1, 4).map(m => m.user.name)
      }
    ]

    const teamPerformanceData = {
      teamOverview: {
        totalMembers,
        activeMembers,
        totalTasksCompleted,
        totalHoursLogged: totalHoursLogged / 3600,
        averageProductivity: Math.round(averageProductivity),
        teamVelocity,
        collaborationScore: Math.round(teamCollaboration.reduce((sum, c) => sum + c.collaborationIndex, 0) / Math.max(1, teamCollaboration.length)),
        qualityScore: Math.round(memberPerformance.reduce((sum, m) => sum + m.metrics.quality, 0) / Math.max(1, memberPerformance.length))
      },
      memberPerformance,
      teamCollaboration,
      skillsMatrix,
      performanceComparison,
      workload,
      milestones
    }

    return NextResponse.json(teamPerformanceData)

  } catch (error) {
    console.error("Error fetching team performance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}