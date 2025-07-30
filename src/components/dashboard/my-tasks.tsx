"use client"

import { useState, useEffect, useCallback } from "react"
import { Task, User, TaskStatus } from "@/types"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet"

export function MyTasks() {
  const { data: session } = useSession() as { data: Session | null }
  const [, setTasks] = useState<Task[]>([])
  const [, setUsers] = useState<User[]>([])
  const [, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const fetchMyTasks = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      const response = await fetch(`/api/tasks?assigneeId=${session.user.id}&dueDate=tomorrow`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    }
  }, [session])

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
      setLoading(true)
      await Promise.all([fetchMyTasks(), fetchUsers(), fetchTaskStatuses()])
      setLoading(false)
    }
    fetchData()
  }, [fetchMyTasks])

  const handleTaskUpdated = () => {
    fetchMyTasks()
    setSelectedTask(null)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="mb-8">
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
