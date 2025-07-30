"use client"

import { useState, useEffect, useCallback } from "react"
import { TasksTable } from "./tasks-table"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet"
import { TaskFormSheet } from "@/components/shared/task-form-sheet"
import type { Task, User, TaskStatus } from "@/types"
import { usePageHeader } from "@/contexts/header-context"

export function DashboardContent() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  usePageHeader(
    <div className="flex items-center justify-between w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Przegląd wszystkich zadań z całego systemu
        </h1>
      </div>

    </div>,
    [] // Re-render when filter changes
  )

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
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
      console.error("Error fetching users:", error)
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
      console.error("Error fetching task statuses:", error)
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
        const errorData = await response.text()
        console.error("Failed to update task:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        // Throw error so optimistic update can handle it
        throw new Error(`Failed to update task: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error("Error updating task:", error)
      // Re-throw error so optimistic update can handle it
      throw error
    }
  }

  const handleTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setDetailsDialogOpen(true)
  }

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task)
    setEditDialogOpen(true)
  }

  const handleTaskUpdated = () => {
    fetchTasks()
    setEditDialogOpen(false)
    setSelectedTask(null)
  }

  if (loading) {
    return <PageLoadingLayout variant="list" showTopBar={false} />
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <TasksTable
        tasks={tasks}
        users={users}
        taskStatuses={taskStatuses}
        onTaskUpdate={handleTaskUpdate}
        onTaskDetails={handleTaskDetails}
        onTaskEdit={handleTaskEdit}
      />

      {/* Task Details Sheet */}
      <TaskDetailsSheet
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        task={selectedTask}
        onEdit={(task, e) => {
          e?.stopPropagation?.()
          handleTaskEdit(task)
        }}
        onTaskUpdated={handleTaskUpdated}
        canEdit={true}
      />

      {/* Task Edit Sheet */}
      <TaskFormSheet
        mode="edit"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onTaskUpdated={handleTaskUpdated}
        task={selectedTask}
      />
    </div>
  )
}
