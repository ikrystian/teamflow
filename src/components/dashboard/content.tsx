"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { MyTasks } from "./my-tasks"
import { TasksTable } from "./tasks-table"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet"
import type { Task, User, TaskStatus } from "@/types"
import type { Session } from "next-auth"
import { usePageHeader } from "@/contexts/header-context"

export function DashboardContent() {
  const { data: session } = useSession() as { data: Session | null }
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Dialog states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

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

    </div>,
    [isAdmin] // Re-render when admin status changes
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

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task> & { assigneeId?: string }) => {
    try {
      // Validate inputs
      if (!taskId || typeof taskId !== 'string') {
        throw new Error('Invalid task ID provided')
      }

      if (!updates || typeof updates !== 'object') {
        throw new Error('Invalid updates provided')
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        // Refresh tasks after update (in background for optimistic updates)
        await fetchTasks()
      } else {
        let errorData = 'Unknown error'
        try {
          errorData = await response.text()
        } catch {
          // If we can't parse the error response, use a default message
          errorData = 'Failed to parse error response'
        }

        // Log error for debugging but don't throw console errors in production
        if (process.env.NODE_ENV === 'development') {
          console.warn("Task update failed:", {
            taskId,
            updates,
            status: response.status,
            statusText: response.statusText,
            error: errorData
          })
        }

        // Throw error so optimistic update can handle it
        throw new Error(`Failed to update task: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      // Only log in development to avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error updating task:", {
          taskId,
          updates,
          error: error instanceof Error ? error.message : error
        })
      }

      // Re-throw error so optimistic update can handle it
      throw error
    }
  }

  const handleTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setDetailsDialogOpen(true)
  }

  const handleTaskUpdated = () => {
    fetchTasks()
    setSelectedTask(null)
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
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

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
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Najbliższe zadania</h3>
            <span className="text-sm text-muted-foreground">
              {upcomingTasks.length} zadań
            </span>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Brak nadchodzących zadań</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {upcomingTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer" onClick={() => handleTaskDetails(task)}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.project?.color || '#3B82F6' }}
                    />
                    <span className="text-sm font-medium truncate">{task.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {new Date(task.dueDate!).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Updated Tasks */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Ostatnio zaktualizowane</h3>
            <span className="text-sm text-muted-foreground">
              {recentlyUpdatedTasks.length} zadań
            </span>
          </div>
          {recentlyUpdatedTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Brak ostatnio zaktualizowanych zadań</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentlyUpdatedTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer" onClick={() => handleTaskDetails(task)}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.project?.color || '#3B82F6' }}
                    />
                    <span className="text-sm font-medium truncate">{task.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {new Date(task.createdAt!).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MyTasks />
      <TasksTable
        tasks={tasks}
        users={users}
        taskStatuses={taskStatuses}
        onTaskUpdate={handleTaskUpdate}
        onTaskDetails={handleTaskDetails}
        isAdmin={isAdmin}
        currentUserId={session?.user?.id}
      />

      {/* Task Details Sheet */}
      <TaskDetailsSheet
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        task={selectedTask}
        onTaskUpdated={handleTaskUpdated}
        canEdit={selectedTask ? (isAdmin || selectedTask.createdBy?.id === session?.user?.id || selectedTask.assignee?.id === session?.user?.id) : false}
      />
    </div>
  )
}
