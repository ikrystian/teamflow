import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { 
      reportType, 
      format, 
      startDate, 
      endDate, 
      projectId, 
      userId, 
      teamId 
    } = await request.json()

    if (!reportType || !format) {
      return NextResponse.json(
        { error: "Report type and format are required" },
        { status: 400 }
      )
    }

    let data: any[] = []
    let filename = ""

    if (reportType === "time-tracking") {
      // Fetch time tracking data
      const whereClause: any = {
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

      if (startDate || endDate) {
        whereClause.date = {}
        if (startDate) whereClause.date.gte = new Date(startDate)
        if (endDate) whereClause.date.lte = new Date(endDate)
      }

      if (projectId) whereClause.task.projectId = projectId
      if (userId) whereClause.userId = userId
      if (teamId) whereClause.task.project.teamId = teamId

      const timeEntries = await prisma.timeEntry.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
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

      data = timeEntries.map(entry => ({
        "Date": entry.date.toISOString().split('T')[0],
        "User": entry.user.name || entry.user.email,
        "Team": entry.task.project.team.name,
        "Project": entry.task.project.name,
        "Task": entry.task.title,
        "Task Status": entry.task.status,
        "Task Priority": entry.task.priority || "None",
        "Hours Logged": entry.hours,
        "Estimated Hours": entry.task.estimatedHours || 0,
        "Description": entry.description || "",
        "Created At": entry.createdAt.toISOString()
      }))

      filename = `time-tracking-report-${new Date().toISOString().split('T')[0]}`

    } else if (reportType === "project-progress") {
      // Fetch project progress data
      const projectWhereClause: any = {
        team: {
          members: {
            some: {
              id: session.user.id
            }
          }
        }
      }

      if (projectId) projectWhereClause.id = projectId
      if (teamId) projectWhereClause.teamId = teamId

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
                  email: true
                }
              },
              timeEntries: {
                where: {
                  ...(startDate && { date: { gte: new Date(startDate) } }),
                  ...(endDate && { date: { lte: new Date(endDate) } })
                }
              }
            }
          }
        }
      })

      data = projects.flatMap(project => 
        project.tasks.map(task => {
          const totalLoggedHours = task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0)
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Done"
          
          return {
            "Team": project.team.name,
            "Project": project.name,
            "Project Status": project.status,
            "Task ID": task.id,
            "Task Title": task.title,
            "Task Status": task.status,
            "Task Priority": task.priority || "None",
            "Assignee": task.assignee?.name || "Unassigned",
            "Assignee Email": task.assignee?.email || "",
            "Due Date": task.dueDate ? task.dueDate.toISOString().split('T')[0] : "",
            "Is Overdue": isOverdue ? "Yes" : "No",
            "Estimated Hours": task.estimatedHours || 0,
            "Logged Hours": totalLoggedHours,
            "Hours Variance": totalLoggedHours - (task.estimatedHours || 0),
            "Created At": task.createdAt.toISOString().split('T')[0],
            "Updated At": task.updatedAt.toISOString().split('T')[0]
          }
        })
      )

      filename = `project-progress-report-${new Date().toISOString().split('T')[0]}`

    } else {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      )
    }

    if (format === "excel") {
      // Generate Excel file
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report")
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`
        }
      })

    } else if (format === "csv") {
      // Generate CSV file
      const worksheet = XLSX.utils.json_to_sheet(data)
      const csvContent = XLSX.utils.sheet_to_csv(worksheet)
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      })

    } else {
      return NextResponse.json(
        { error: "Invalid format. Supported formats: excel, csv" },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error("Error exporting report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
