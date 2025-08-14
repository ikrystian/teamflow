import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import type { Session } from "next-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params

    // Verify user has access to the task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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
    })

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      )
    }

    // Fetch time entries for the task
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        taskId: taskId
      },
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
    })

    // Calculate total time spent
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0)

    return NextResponse.json({
      timeEntries,
      totalHours,
      estimatedHours: task.estimatedHours
    })
  } catch (error) {
    console.error("Error fetching time entries:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params
    const { hours, description, date } = await request.json()

    if (!hours || hours <= 0) {
      return NextResponse.json(
        { error: "Hours must be a positive number" },
        { status: 400 }
      )
    }

    // Verify user has access to the task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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
    })

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      )
    }

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        hours: parseFloat(hours),
        description: description || null,
        date: date ? new Date(date) : new Date(),
        taskId: taskId,
        userId: session.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json({ timeEntry }, { status: 201 })
  } catch (error) {
    console.error("Error creating time entry:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params
    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get("entryId")

    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      )
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin()

    // Find the time entry with different conditions based on admin status
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: entryId,
        taskId: taskId,
        ...(userIsAdmin ? {} : { userId: session.user.id }), // Admin can access any time entry
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
      },
      include: {
        user: true,
        task: {
          include: {
            project: {
              include: {
                team: {
                  include: {
                    members: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!timeEntry) {
      return NextResponse.json(
        { error: "Time entry not found or access denied" },
        { status: 404 }
      )
    }

    // Additional permission check: user must own the entry or be admin
    if (!userIsAdmin && timeEntry.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this time entry" },
        { status: 403 }
      )
    }

    await prisma.timeEntry.delete({
      where: { id: entryId }
    })

    return NextResponse.json({ message: "Time entry deleted successfully" })
  } catch (error) {
    console.error("Error deleting time entry:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
