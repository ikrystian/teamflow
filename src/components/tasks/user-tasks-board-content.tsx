"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { usePageHeader } from "@/contexts/header-context"
import { Plus, LayoutGrid } from "lucide-react"
import { KanbanBoard } from "@/components/shared/kanban-board"
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog"
import { TimeTrackingSheet } from "@/components/tasks/time-tracking-sheet"
import { type Task, type Project, type TaskStatus } from "@/types"

export function UserTasksBoardContent() {
  const { data: session } = useSession() as { data: Session | null }
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false)
  const [timeTrackingDialogOpen, setTimeTrackingDialogOpen] = useState(false)

  const checkAdminStatus = useCallback(async () => {
    if (session?.user) {
      try {
        const response = await fetch('/api/user/admin-status')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }
  }, [session])

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses || [])
      }
    } catch (error) {
      console.error('Error fetching task statuses:', error)
    }
  }, [])

  const fetchUserTasks = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      const response = await fetch(`/api/tasks?assigneeId=${session.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching user tasks:', error)
    }
  }, [session?.user?.id])

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        const mappedProjects = (data.projects || []).map((p: Project) => ({
          id: p.id,
          name: p.name,
        }))
        setProjects(mappedProjects)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      checkAdminStatus(),
      fetchTaskStatuses(),
      fetchUserTasks(),
      fetchProjects(),
    ])
    setLoading(false)
  }, [checkAdminStatus, fetchTaskStatuses, fetchUserTasks, fetchProjects])

  useEffect(() => {
    if (session?.user?.id) {
      loadData()
    }
  }, [session?.user?.id, loadData])

  const handleTaskUpdated = useCallback(() => {
    fetchUserTasks()
  }, [fetchUserTasks])

  const handleCreateTask = useCallback(() => {
    setCreateTaskDialogOpen(true)
  }, [])

  const handleTaskCreated = useCallback(() => {
    fetchUserTasks()
    setCreateTaskDialogOpen(false)
  }, [fetchUserTasks])

  const handleTaskEdit = useCallback((task: Task) => {
    setSelectedTask(task)
  }, [])

  const handleTimeTracking = useCallback((task: Task) => {
    setSelectedTask(task)
    setTimeTrackingDialogOpen(true)
  }, [])

  const handleDeleteTask = useCallback(async (task: Task) => {
    // Optimistic delete
    setTasks(prev => prev.filter(t => t.id !== task.id))

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        // Rollback
        fetchUserTasks()
        alert(data.error || "Nie udało się usunąć zadania")
      }
    } catch (error) {
      console.error("Error deleting task:", error)
      fetchUserTasks()
      alert("Wystąpił błąd podczas usuwania zadania")
    }
  }, [fetchUserTasks])

  const canEditTask = useCallback((task: Task) => {
    if (!session?.user?.id) return false
    return task.assignee?.id === session.user.id || task.createdBy?.id === session.user.id || isAdmin
  }, [session?.user?.id, isAdmin])

  // Page Header content
  usePageHeader(
    <div className="flex items-center justify-between w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Moje zadania</h1>
      </div>
      <div>
        <Button onClick={handleCreateTask}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj zadanie
        </Button>
      </div>
    </div>,
    [handleCreateTask]
  )

  if (loading) {
    return <PageLoadingLayout variant="details" />
  }

  return (
    <div className="space-y-6 p-4 md:p-8 pt-6 relative" id="user-tasks-board">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Tablica zadań</h2>
            <p className="text-sm text-muted-foreground">Przeciągnij zadania między kolumnami, aby zaktualizować ich status</p>
          </div>
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <LayoutGrid className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Brak zadań przypisanych do Ciebie
                </h3>
                <p className="text-muted-foreground mb-4">
                  Nie masz żadnych przypisanych zadań ze wszystkich projektów.
                </p>
                <Button onClick={handleCreateTask}>
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz zadanie
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <KanbanBoard
            tasks={tasks}
            taskStatuses={taskStatuses}
            projects={projects}
            onTaskUpdated={handleTaskUpdated}
            onTaskEdit={handleTaskEdit}
            onTimeTracking={handleTimeTracking}
            onTaskDelete={handleDeleteTask}
            canEditTask={canEditTask}
            onCreateTask={handleCreateTask}
            showProjectName={true}
          />
        )}
      </div>

      <TaskDetailsDialog
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
        task={null}
        mode="create"
        projects={projects}
        onTaskCreated={handleTaskCreated}
      />

      <TimeTrackingSheet
        open={timeTrackingDialogOpen}
        onOpenChange={setTimeTrackingDialogOpen}
        onTimeLogged={handleTaskUpdated}
        task={selectedTask}
      />
    </div>
  )
}
