import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// Helper to get start of day
function getStartOfDay(date: Date): Date {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    return start
}

// Helper to get start of week (Monday)
function getStartOfWeek(date: Date): Date {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    return start
}

// Helper to get start of month
function getStartOfMonth(date: Date): Date {
    const start = new Date(date)
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return start
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions) as Session | null

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = session.user.id
        const now = new Date()

        const startOfToday = getStartOfDay(now)
        const startOfWeek = getStartOfWeek(now)
        const startOfMonth = getStartOfMonth(now)

        // Get "Done" status for counting completed tasks
        const doneStatus = await prisma.taskStatus.findFirst({
            where: { name: 'Done' }
        })

        // Fetch time entries for the user in the current month (covers all periods)
        const timeEntries = await prisma.timeEntry.findMany({
            where: {
                userId: userId,
                date: {
                    gte: startOfMonth
                }
            },
            select: {
                hours: true,
                date: true
            }
        })

        // Fetch completed tasks for the user in the current month
        const completedTasks = doneStatus ? await prisma.task.findMany({
            where: {
                assigneeId: userId,
                statusId: doneStatus.id,
                deletedAt: null,
                updatedAt: {
                    gte: startOfMonth
                }
            },
            select: {
                id: true,
                updatedAt: true
            }
        }) : []

        // Calculate hours by period
        const hoursToday = timeEntries
            .filter(entry => entry.date >= startOfToday)
            .reduce((sum, entry) => sum + entry.hours, 0)

        const hoursThisWeek = timeEntries
            .filter(entry => entry.date >= startOfWeek)
            .reduce((sum, entry) => sum + entry.hours, 0)

        const hoursThisMonth = timeEntries
            .reduce((sum, entry) => sum + entry.hours, 0)

        // Calculate completed tasks by period
        const tasksCompletedToday = completedTasks
            .filter(task => task.updatedAt >= startOfToday)
            .length

        const tasksCompletedThisWeek = completedTasks
            .filter(task => task.updatedAt >= startOfWeek)
            .length

        const tasksCompletedThisMonth = completedTasks.length

        return NextResponse.json({
            today: {
                hoursReported: Math.round(hoursToday * 100) / 100,
                tasksCompleted: tasksCompletedToday
            },
            thisWeek: {
                hoursReported: Math.round(hoursThisWeek * 100) / 100,
                tasksCompleted: tasksCompletedThisWeek
            },
            thisMonth: {
                hoursReported: Math.round(hoursThisMonth * 100) / 100,
                tasksCompleted: tasksCompletedThisMonth
            }
        })
    } catch (error) {
        console.error("Error fetching dashboard summary:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
