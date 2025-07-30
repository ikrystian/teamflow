"use client"

import { useState, useEffect, useCallback } from "react"
import { TasksTable } from "./tasks-table"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task, User, TaskStatus } from "@/types"
import { usePageHeader } from "@/contexts/header-context"

export function DashboardContent() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)

  usePageHeader(
    <div className="flex items-center justify-between w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Przegląd wszystkich zadań z całego systemu ({tasks.length} zadań)
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

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        // Refresh tasks after update
        await fetchTasks()
      } else {
        console.error("Failed to update task")
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  if (loading) {
    return <PageLoadingLayout variant="list" showTopBar={false} />
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">


      <Card>
        <CardHeader>
          <CardTitle>Wszystkie zadania</CardTitle>
          <CardDescription>
            Tabelka zadań w stylu Asana z możliwością edycji inline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TasksTable
            tasks={tasks}
            users={users}
            taskStatuses={taskStatuses}
            onTaskUpdate={handleTaskUpdate}
          />
        </CardContent>
      </Card>
    </div>
  )
}
