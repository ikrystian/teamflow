"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import type { Task, User, TaskStatus } from "@/types"
import type { Session } from "next-auth"
import { usePageHeader } from "@/contexts/header-context"
import { formatTaskDueDateWithRelative, formatCreatedDate } from "@/lib/date-utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Calendar, User as UserIcon, ArrowRight } from "lucide-react"
import { PrintTodosDialog } from "./print-todos-dialog"

export function DashboardContent() {
  const { data: session } = useSession() as { data: Session | null }
  const [tasks, setTasks] = useState<Task[]>([])
  const [ ,setUsers] = useState<User[]>([])
  const [ ,setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Dialog states
  const [ ,setSelectedTask] = useState<Task | null>(null)
  const [ ,setDetailsDialogOpen] = useState(false)

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/user/admin-status')
          if (response.ok) {
            const data = await response.json()
            setIsAdmin(data.isAdmin)
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error checking admin status:', error)
          }
        }
      }
    }
    checkAdminStatus()
  }, [session])

  const getPageTitle = () => {
    if (isAdmin) {
      return "Przegląd wszystkich zadań z całego systemu"
    }
    return "Przegląd moich zadań"
  }

  usePageHeader(
    <div className="flex items-center justify-between w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {getPageTitle()}
        </h1>
      </div>
      <div>
        <PrintTodosDialog tasks={tasks} />
      </div>
    </div>,
    [isAdmin, tasks] // Re-render when admin status or tasks change
  )

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      } else {
        // Only log non-ok responses in development
        if (process.env.NODE_ENV === 'development') {
          console.warn("Failed to fetch tasks:", response.status, response.statusText)
        }
        setTasks([]) // Set empty array on error
      }
    } catch (error) {
      // Only log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error fetching tasks:", error instanceof Error ? error.message : error)
      }
      setTasks([]) // Set empty array on error
    }
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error fetching users:", error)
      }
    }
  }

  const fetchTaskStatuses = async () => {
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error fetching task statuses:", error)
      }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchTasks(), fetchUsers(), fetchTaskStatuses()])
      setLoading(false)

    }
    fetchData()
  }, [fetchTasks])



  const handleTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setDetailsDialogOpen(true)
  }


  if (loading) {
    return <PageLoadingLayout variant="list" showTopBar={false} />
  }

  // Get user's upcoming tasks (due in next 7 days)
  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate || !session?.user?.id) return false

    // For admin, show all upcoming tasks; for user, show only assigned/created tasks
    const hasAccess = isAdmin ||
                     task.assignee?.id === session.user.id ||
                     task.createdBy?.id === session.user.id

    if (!hasAccess) return false

    const dueDate = new Date(task.dueDate)
    const today = new Date()
    const sevenDaysFromNow = new Date()

    // Normalize dates to compare date-only (not timestamps)
    dueDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    sevenDaysFromNow.setHours(0, 0, 0, 0)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    return dueDate >= today && dueDate <= sevenDaysFromNow
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

  // Get recently updated tasks (updated in last 3 days)
  const recentlyUpdatedTasks = tasks.filter(task => {
    if (!task.createdAt || !session?.user?.id) return false

    // For admin, show all recent tasks; for user, show only assigned/created tasks
    const hasAccess = isAdmin ||
                     task.assignee?.id === session.user.id ||
                     task.createdBy?.id === session.user.id

    if (!hasAccess) return false

    const updatedDate = new Date(task.createdAt)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    return updatedDate >= threeDaysAgo
  }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 10)

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <CardTitle>Najbliższe zadania</CardTitle>
            </div>
            <CardDescription>
              {upcomingTasks.length === 0
                ? "Brak nadchodzących zadań w najbliższych 7 dniach"
                : `${upcomingTasks.length} ${upcomingTasks.length === 1 ? 'zadanie' : upcomingTasks.length < 5 ? 'zadania' : 'zadań'} do wykonania`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Wszystkie zadania są pod kontrolą!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {upcomingTasks.map(task => (
                  <div
                    key={task.id}
                    className="group flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-border"
                    onClick={() => handleTaskDetails(task)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-background"
                        style={{ backgroundColor: task.project?.color || '#3B82F6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{task.title}</span>
                          {task.assignee && (
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={task.assignee.avatarUrl || ""} alt={task.assignee.name} />
                              <AvatarFallback className="text-xs">
                                {task.assignee.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        {task.project && (
                          <p className="text-xs text-muted-foreground truncate">
                            {task.project.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {formatTaskDueDateWithRelative(task.dueDate!)}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Updated Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-green-500" />
              <CardTitle>Ostatnio zaktualizowane</CardTitle>
            </div>
            <CardDescription>
              {recentlyUpdatedTasks.length === 0
                ? "Brak aktywności w ostatnich 3 dniach"
                : `${recentlyUpdatedTasks.length} ${recentlyUpdatedTasks.length === 1 ? 'zadanie' : recentlyUpdatedTasks.length < 5 ? 'zadania' : 'zadań'} z ostatnich 3 dni`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentlyUpdatedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Brak ostatnich aktualizacji zadań
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentlyUpdatedTasks.map(task => (
                  <div
                    key={task.id}
                    className="group flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-border"
                    onClick={() => handleTaskDetails(task)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-background"
                        style={{ backgroundColor: task.project?.color || '#3B82F6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{task.title}</span>
                          {task.createdBy && (
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={task.createdBy.avatarUrl || ""} alt={task.createdBy.name} />
                              <AvatarFallback className="text-xs">
                                {task.createdBy.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        {task.project && (
                          <p className="text-xs text-muted-foreground truncate">
                            {task.project.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {formatCreatedDate(task.createdAt!)}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
