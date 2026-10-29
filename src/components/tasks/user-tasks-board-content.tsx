"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth/use-session"
import type { AppSession as Session } from "@/lib/auth/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { usePageHeader } from "@/contexts/header-context"
import { Plus, LayoutGrid, Webhook } from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"
import { KanbanBoard } from "@/components/shared/kanban-board"
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog"
import { TimeTrackingSheet } from "@/components/tasks/time-tracking-sheet"
import { type Task, type Project, type TaskStatus } from "@/types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GithubWebhookLogs } from "@/components/dashboard/github-webhook-logs"
import { softDeleteTaskWithUndo } from "@/lib/task-delete"
import { isManagerRole } from "@/lib/roles"
import { managerCanEditStatus } from "@/lib/task-status-helpers"
import { toast } from "sonner"

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
    // Optimistic delete from the UI
    setTasks(prev => prev.filter(t => t.id !== task.id))

    // Soft-delete with a 5s undo window (then permanent delete server-side).
    const result = await softDeleteTaskWithUndo(task.id, {
      onRestored: fetchUserTasks,
    })
    if (!result.ok) {
      fetchUserTasks() // rollback
      toast.error(result.error || "Nie udało się usunąć zadania")
    }
  }, [fetchUserTasks])

  const canEditTask = useCallback((task: Task) => {
    if (!session?.user?.id) return false
    const baseCanEdit = task.assignee?.id === session.user.id || task.createdBy?.id === session.user.id || isAdmin
    if (!baseCanEdit) return false
    // Managers are further restricted to tasks in To Do / To Test.
    if (isManagerRole(session.user.role)) {
      const statusName = taskStatuses.find(s => s.id === task.statusId)?.name ?? task.taskStatus?.name
      if (!managerCanEditStatus(statusName)) return false
    }
    return true
  }, [session?.user?.id, session?.user?.role, isAdmin, taskStatuses])

  // Page Header content
  usePageHeader(
    <PageHeader
      title="Moje zadania"
      description="Zadania przypisane do Ciebie ze wszystkich projektów"
      actions={
        <Button size="sm" onClick={handleCreateTask}>
          <Plus />
          <span className="hidden sm:inline">Dodaj zadanie</span>
        </Button>
      }
    />,
    [handleCreateTask]
  )

  if (loading) {
    return <PageLoadingLayout variant="details" />
  }

  return (
    <div className="space-y-4 p-4 md:p-6 relative" id="user-tasks-board">
      <Tabs defaultValue="board" className="w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <TabsList className="grid w-full sm:w-[240px] grid-cols-2">
            <TabsTrigger value="board"><LayoutGrid />Tablica</TabsTrigger>
            <TabsTrigger value="logs"><Webhook />Logi GitHub</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="board" className="mt-0">
          {tasks.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
                    <LayoutGrid className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Brak zadań przypisanych do Ciebie
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    Nie masz żadnych przypisanych zadań ze wszystkich projektów.
                  </p>
                  <Button size="sm" onClick={handleCreateTask}>
                    <Plus />
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
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <GithubWebhookLogs embedMode />
        </TabsContent>
      </Tabs>

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
