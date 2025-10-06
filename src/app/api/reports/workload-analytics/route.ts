import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays, format, addDays, eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns"

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

    // Calculate date range
    const endDateTime = endDate ? new Date(endDate) : new Date()
    const startDateTime = startDate ? new Date(startDate) : subDays(endDateTime, 30)

    // Build filters
    const filters: Record<string, unknown> = {
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

    // Get team members with detailed workload data
    const teamMembers = await prisma.user.findMany({
      where: {
        OR: [
          {
            assignedTasks: {
              some: {
                createdAt: {
                  gte: startOfDay(startDateTime),
                  lte: endOfDay(endDateTime)
                }
              }
            }
          },
          {
            timeEntries: {
              some: {
                date: {
                  gte: startOfDay(startDateTime),
                  lte: endOfDay(endDateTime)
                }
              }
            }
          }
        ]
      },
      include: {
        assignedTasks: {
          where: {
            OR: [
              filters,
              {
                assigneeId: userId && userId !== "all" ? userId : undefined,
                dueDate: {
                  gte: new Date(),
                  lte: addDays(new Date(), 30)
                }
              }
            ]
          },
          include: {
            timeEntries: true,
            taskStatus: true
          },
          orderBy: {
            dueDate: 'asc'
          }
        },
        timeEntries: {
          where: {
            date: {
              gte: startOfDay(startDateTime),
              lte: endOfDay(endDateTime)
            }
          },
          include: {
            task: true
          }
        }
      }
    })

    // Calculate overview metrics
    const totalWorkload = teamMembers.reduce((sum, member) =>
      sum + member.timeEntries.reduce((timeSum, entry) => timeSum + entry.hours, 0), 0
    )

    const memberWorkloads = teamMembers.map(member => {
      const weeklyHours = member.timeEntries.reduce((sum, entry) => sum + entry.hours, 0)
      const contractHours = 40 // Mock - in real app get from user profile
      return weeklyHours / contractHours * 100
    })

    const averageWorkload = memberWorkloads.length > 0 ?
      memberWorkloads.reduce((sum, w) => sum + w, 0) / memberWorkloads.length : 0

    const overloadedMembers = memberWorkloads.filter(w => w > 100).length
    const underutilizedMembers = memberWorkloads.filter(w => w < 60).length

    // Determine burnout risk level
    const highRiskMembers = memberWorkloads.filter(w => w > 120).length
    const burnoutRiskLevel = highRiskMembers > 0 ? "high" :
                           overloadedMembers > teamMembers.length / 2 ? "medium" : "low"

    const teamCapacityUtilization = Math.round(averageWorkload)
    const workloadBalance = Math.round(100 - (
      (Math.max(...memberWorkloads) - Math.min(...memberWorkloads)) / 100 * 100
    ))
    const efficiencyScore = Math.round(teamMembers.reduce((sum, member) => {
      const tasksCompleted = member.assignedTasks.filter(t => t.taskStatus?.name === "Done").length
      const totalTasks = member.assignedTasks.length
      return sum + (totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0)
    }, 0) / Math.max(1, teamMembers.length))

    // Generate detailed member workload data
    const memberWorkload = teamMembers.map(member => {
      const contractHours = 40 // Mock
      const optimalHours = contractHours * 0.85 // 85% utilization is optimal
      const maxHours = contractHours * 1.2 // 20% overtime max

      const hoursWorked = member.timeEntries.reduce((sum, entry) => sum + entry.hours, 0)
      const hoursAllocated = member.assignedTasks.reduce((sum, task) =>
        sum + (task.estimatedHours || 0), 0
      )

      const tasksAssigned = member.assignedTasks.length
      const tasksInProgress = member.assignedTasks.filter(t =>
        t.taskStatus?.name === "In Progress" || t.taskStatus?.name === "To Do"
      ).length

      const utilizationRate = Math.round((hoursWorked / contractHours) * 100)
      const efficiencyScore = tasksAssigned > 0 ?
        Math.round((member.assignedTasks.filter(t => t.taskStatus?.name === "Done").length / tasksAssigned) * 100) : 0

      // Calculate burnout indicators
      const overtimeHours = Math.max(0, hoursWorked - contractHours)
      const consecutiveHighWorkloadDays = Math.round(Math.random() * 7) // Mock

      const stressSignals = []
      if (overtimeHours > 10) {
        stressSignals.push({
          indicator: "Nadgodziny",
          severity: "high" as const,
          description: `${overtimeHours.toFixed(1)} godzin nadgodzin w tym tygodniu`
        })
      }
      if (tasksInProgress > 8) {
        stressSignals.push({
          indicator: "Przeciążenie zadaniami",
          severity: "medium" as const,
          description: `${tasksInProgress} aktywnych zadań jednocześnie`
        })
      }
      if (utilizationRate > 120) {
        stressSignals.push({
          indicator: "Bardzo wysokie wykorzystanie",
          severity: "high" as const,
          description: `${utilizationRate}% wykorzystania czasu pracy`
        })
      }

      const riskLevel = stressSignals.some(s => s.severity === "high") ? "high" :
                      stressSignals.some(s => s.severity === "medium") ? "medium" : "low"

      // Generate trends
      const dateRange = eachDayOfInterval({ start: startDateTime, end: endDateTime })
      const dailyHours = dateRange.map(date => {
        const dayStart = startOfDay(date)
        const dayEnd = endOfDay(date)

        const dayEntries = member.timeEntries.filter(entry =>
          entry.date >= dayStart && entry.date <= dayEnd
        )

        const hours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0)
        const planned = 8 // Mock planned hours per day

        return {
          date: format(date, 'yyyy-MM-dd'),
          hours,
          planned
        }
      })

      const weeks = eachWeekOfInterval({ start: startDateTime, end: endDateTime })
      const weeklyWorkload = weeks.map(week => {
        const weekStart = startOfWeek(week)
        const weekEnd = endOfWeek(week)

        const weekEntries = member.timeEntries.filter(entry =>
          entry.date >= weekStart && entry.date <= weekEnd
        )

        const workload = weekEntries.reduce((sum, entry) => sum + entry.hours, 0)

        return {
          week: format(week, 'yyyy-MM-dd'),
          workload,
          capacity: contractHours
        }
      })

      const productivityTrend = dateRange.slice(-14).map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        score: Math.round(efficiencyScore + (Math.random() * 20 - 10))
      }))

      // Upcoming deadlines
      const upcomingDeadlines = member.assignedTasks
        .filter(task => task.dueDate && new Date(task.dueDate) > new Date())
        .slice(0, 5)
        .map(task => ({
          taskTitle: task.title,
          dueDate: format(new Date(task.dueDate!), 'yyyy-MM-dd'),
          estimatedHours: task.estimatedHours || 0,
          priority: task.priority || 'Medium'
        }))

      return {
        user: {
          id: member.id,
          name: member.name || 'Bez nazwy',
          email: member.email,
          avatarUrl: member.avatarUrl,
          role: 'Developer', // Mock
          contractHours
        },
        currentWorkload: {
          hoursAllocated,
          hoursWorked,
          tasksAssigned,
          tasksInProgress,
          utilizationRate,
          efficiencyScore
        },
        capacity: {
          maxHours,
          optimalHours,
          availableHours: Math.max(0, maxHours - hoursWorked),
          overheadHours: Math.max(0, hoursWorked - contractHours)
        },
        burnoutIndicators: {
          riskLevel,
          overtimeHours,
          consecutiveHighWorkloadDays,
          stressSignals
        },
        trends: {
          dailyHours,
          weeklyWorkload,
          productivityTrend
        },
        upcomingDeadlines
      }
    })

    // Generate workload distribution over time
    const timeSlots = eachDayOfInterval({ start: startDateTime, end: endDateTime })
      .map(date => format(date, 'yyyy-MM-dd'))
      .slice(-14) // Last 2 weeks

    const workloadDistribution = timeSlots.map(timeSlot => {
      const date = new Date(timeSlot)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)

      const dayEntries = teamMembers.flatMap(member =>
        member.timeEntries.filter(entry =>
          entry.date >= dayStart && entry.date <= dayEnd
        )
      )

      const totalHours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0)
      const plannedHours = teamMembers.length * 8 // 8 hours per person
      const actualHours = totalHours
      const utilizationRate = plannedHours > 0 ? Math.round((actualHours / plannedHours) * 100) : 0

      return {
        timeSlot,
        totalHours,
        plannedHours,
        actualHours,
        utilizationRate
      }
    })

    // Project workload breakdown
    const projects = await prisma.project.findMany({
      where: {
        archived: false,
        ...(teamId && teamId !== "all" ? { teamId } : {})
      },
      include: {
        tasks: {
          include: {
            timeEntries: {
              where: {
                createdAt: {
                  gte: startOfDay(startDateTime),
                  lte: endOfDay(endDateTime)
                }
              }
            }
          }
        },
        team: {
          include: {
            members: true
          }
        }
      }
    })

    const projectWorkload = projects.map(project => {
      const totalHours = project.tasks.reduce((sum, task) =>
        sum + task.timeEntries.reduce((timeSum, entry) => timeSum + entry.hours, 0), 0
      )

      const teamMembersCount = project.team?.members.length ?? 0
      const averageWorkload = teamMembersCount > 0 ? totalHours / teamMembersCount : 0

      // Mock deadline stress calculation
      const upcomingDeadlines = project.tasks.filter(task =>
        task.dueDate && new Date(task.dueDate) <= addDays(new Date(), 14)
      ).length
      const deadlineStress = Math.min(100, upcomingDeadlines * 10)

      return {
        project: project.name,
        totalHours,
        teamMembers: teamMembersCount,
        averageWorkload,
        deadlineStress,
        color: project.color || '#3B82F6'
      }
    })

    // Generate predictions
    const nextWeekWorkload = memberWorkload.map(member => {
      const currentUtilization = member.currentWorkload.utilizationRate
      const trend = member.trends.weeklyWorkload.slice(-2)

      let predictedHours = member.currentWorkload.hoursWorked
      if (trend.length === 2) {
        const weeklyChange = trend[1].workload - trend[0].workload
        predictedHours = Math.max(0, trend[1].workload + weeklyChange)
      }

      const confidence = Math.min(95, Math.max(60, 90 - Math.abs(currentUtilization - 85)))
      const riskLevel = predictedHours > member.user.contractHours * 1.1 ? "high" :
                      predictedHours > member.user.contractHours * 0.9 ? "medium" : "low"

      return {
        user: member.user.name,
        predictedHours,
        confidence,
        riskLevel
      }
    })

    // Capacity gaps analysis
    const capacityGaps = [
      {
        period: "Następny tydzień",
        shortfall: Math.max(0, nextWeekWorkload.reduce((sum, w) => sum + Math.max(0, w.predictedHours - 40), 0)),
        surplus: Math.max(0, nextWeekWorkload.reduce((sum, w) => sum + Math.max(0, 40 - w.predictedHours), 0)),
        recommendations: [
          "Rozważenie redystrybucji zadań między członkami zespołu",
          "Przeniesienie mniej pilnych zadań na kolejny sprint",
          "Zwiększenie priorytetów dla kluczowych funkcjonalności"
        ]
      }
    ]

    // Burnout risk predictions
    const burnoutRisk = memberWorkload.map(member => {
      const currentRisk = member.burnoutIndicators.riskLevel === "high" ? 80 :
                         member.burnoutIndicators.riskLevel === "medium" ? 50 : 20

      const utilizationTrend = member.currentWorkload.utilizationRate > 100 ? 10 : -5
      const projectedRisk = Math.min(100, Math.max(0, currentRisk + utilizationTrend))

      const preventionActions = []
      if (projectedRisk > 70) {
        preventionActions.push("Natychmiastowe zmniejszenie obciążenia")
        preventionActions.push("Zaplanowanie dni odpoczynku")
        preventionActions.push("Rozmowa z team leadem o workload balance")
      } else if (projectedRisk > 40) {
        preventionActions.push("Monitorowanie obciążenia w kolejnych tygodniach")
        preventionActions.push("Regularne check-iny dotyczące samopoczucia")
      }

      return {
        user: member.user.name,
        currentRisk,
        projectedRisk,
        preventionActions
      }
    })

    // Generate recommendations
    const immediate = [
      {
        priority: "high" as const,
        action: "Redystrybucja zadań dla przeciążonych członków zespołu",
        impact: "Zmniejszenie ryzyka wypalenia i poprawa jakości pracy",
        effort: "medium" as const
      },
      {
        priority: "medium" as const,
        action: "Wdrożenie regularnych check-inów dotyczących obciążenia",
        impact: "Wczesne wykrywanie problemów z workload",
        effort: "low" as const
      }
    ]

    const longTerm = [
      {
        strategy: "Automatyzacja procesów i optymalizacja workflow",
        benefits: [
          "Redukcja czasu potrzebnego na rutynowe zadania",
          "Zwiększenie efektywności zespołu",
          "Lepsza prognozowalność obciążenia"
        ],
        timeline: "3-6 miesięcy",
        resources: ["DevOps engineer", "Process improvement tools"]
      },
      {
        strategy: "Wdrożenie systemu zarządzania capacity planning",
        benefits: [
          "Lepsze planowanie projektów",
          "Proaktywne zarządzanie zasobami",
          "Zmniejszenie ryzyka przeciążenia"
        ],
        timeline: "2-4 miesiące",
        resources: ["Project management tools", "Team training"]
      }
    ]

    const workloadAnalyticsData = {
      overview: {
        totalWorkload: totalWorkload / 3600,
        averageWorkload: Math.round(averageWorkload),
        overloadedMembers,
        underutilizedMembers,
        burnoutRiskLevel,
        teamCapacityUtilization,
        workloadBalance,
        efficiencyScore
      },
      memberWorkload,
      workloadDistribution,
      projectWorkload,
      predictions: {
        nextWeekWorkload,
        capacityGaps,
        burnoutRisk
      },
      recommendations: {
        immediate,
        longTerm
      }
    }

    return NextResponse.json(workloadAnalyticsData)

  } catch (error) {
    console.error("Error fetching workload analytics:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
