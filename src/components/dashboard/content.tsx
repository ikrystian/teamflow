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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <MyTasks />
      <TasksTable
        tasks={tasks}
        users={users}
        taskStatuses={taskStatuses}
        onTaskUpdate={handleTaskUpdate}
        onTaskDetails={handleTaskDetails}
      />

      {/* Task Details Sheet */}
      <TaskDetailsSheet
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        task={selectedTask}
        onTaskUpdated={handleTaskUpdated}
        canEdit={false}
      />
    </div>
  )
}
