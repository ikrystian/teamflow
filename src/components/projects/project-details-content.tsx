"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { useProjectViewPreferences } from "@/hooks/use-project-view-preferences"
import { usePageHeader } from "@/contexts/header-context"


import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  List,
  LayoutGrid,
  Settings,
  Info,
} from "lucide-react"
import Link from "next/link"
import { KanbanBoard } from "@/components/shared/kanban-board"
import { ProjectDailyView } from "./project-daily-view"
import { TaskDetailsDialog } from "../tasks/task-details-dialog"
import { TimeTrackingSheet } from "../tasks/time-tracking-sheet"
import { TaskBoardFilters } from "./task-board-filters"
import { QuickAddTaskCommand } from "./quick-add-task-command"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { type Task, type Project, type TaskStatus } from "@/types"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"

interface ProjectDetailsContentProps {
  projectId: string
}

export function ProjectDetailsContent({ projectId }: ProjectDetailsContentProps) {
  const { data: session } = useSession() as { data: Session | null }

  // Helper function to get all project members ( direct members)
  const getProjectMembers = (project: Project | null) => {
    if (!project) return []

    const members: Array<{
      id: string
      name: string
      email: string
      avatarUrl?: string | null
    }> = []
    // Add project creator if not already included
    if (project.createdBy && !members.find(m => m.id === project.createdBy!.id)) {
      members.push({
        id: project.createdBy.id,
        name: project.createdBy.name || project.createdBy.email,
        email: project.createdBy.email,
        avatarUrl: project.createdBy.avatarUrl ?? undefined
      })
    }

    return members
  }
  const [project, setProject] = useState<Project | null>(null)
  // Optimistic overlay of the project's tasks. Seeded from the server data and
  // mutated immediately when a task is added, so the UI updates without waiting
  // for the create request + refetch to complete.
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false)
  const [timeTrackingDialogOpen, setTimeTrackingDialogOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const { viewMode, updateViewMode, isLoaded: viewPreferencesLoaded } = useProjectViewPreferences(projectId)
  const [taskFilter, setTaskFilter] = useState<"all" | "mine" | string>("all")
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  // const { projects } = useProjects()

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      } else if (response.status === 404) {
        router.push("/dashboard/projects")
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId, router])

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

  useEffect(() => {
    fetchProject()
    checkAdminStatus()
  }, [fetchProject, checkAdminStatus])

  // Keep the optimistic task overlay in sync with the server data. This replaces
  // the whole array, so any optimistic temp task is reconciled with server truth
  // (or dropped if the create failed) the moment fresh data arrives.
  useEffect(() => {
    setTasks(project?.tasks || [])
  }, [project])

  // Fetch task statuses once so optimistic cards can be placed in the default
  // column on the board (and to avoid the board fetching them again).
  useEffect(() => {
    let cancelled = false
    const fetchTaskStatuses = async () => {
      try {
        const response = await fetch('/api/system/task-statuses')
        if (response.ok) {
          const data = await response.json()
          if (!cancelled) setTaskStatuses(data.taskStatuses || [])
        }
      } catch (error) {
        console.error('Error fetching task statuses:', error)
      }
    }
    fetchTaskStatuses()
    return () => { cancelled = true }
  }, [])

  const handleCreateTask = () => {
    setCreateTaskDialogOpen(true)
  }

  const handleTaskCreated = () => {
    fetchProject()
    setCreateTaskDialogOpen(false)
  }

  // Insert a temporary task immediately for a snappy "add task" experience.
  // Returns the temp id so the caller can roll it back if the request fails.
  const handleOptimisticCreate = (title: string): string | undefined => {
    if (!project) return undefined
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const defaultStatus = taskStatuses.find(s => s.isDefault) ?? taskStatuses[0]
    const optimisticTask: Task = {
      id: tempId,
      title,
      statusId: defaultStatus?.id,
      createdAt: new Date().toISOString(),
      project: { id: project.id, name: project.name, color: project.color },
      assignee: session?.user?.id
        ? {
          id: session.user.id,
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          avatarUrl: session.user.image ?? null,
        }
        : undefined,
      subtasks: [],
      comments: [],
    }
    setTasks(prev => [...prev, optimisticTask])
    return tempId
  }

  const handleOptimisticRollback = (tempId: string) => {
    setTasks(prev => prev.filter(t => t.id !== tempId))
  }

  // Set page header content
  usePageHeader(
    project ? (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge>
            {project.status}
          </Badge>

          {/* View Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => updateViewMode("list")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "board" ? "default" : "ghost"}
              size="sm"
              onClick={() => updateViewMode("board")}
              className="rounded-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "daily" ? "default" : "ghost"}
              size="sm"
              onClick={() => updateViewMode("daily")}
              className="rounded-l-none"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          <Link href={`/dashboard/projects/${projectId}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Ustawienia
            </Button>
          </Link>

          <Link href={`/dashboard/projects/${projectId}/info`}>
            <Button variant="outline" size="sm">
              <Info className="mr-2 h-4 w-4" />
              Informacje o projekcie
            </Button>
          </Link>

          <Button onClick={handleCreateTask}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj zadanie
          </Button>
        </div>
      </div>
    ) : (
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ładowanie projektu...</h1>
      </div>
    ),
    [project, viewMode, projectId] // Re-render when project, viewMode or projectId changes
  )

  const handleTaskUpdated = (updatedTask?: Task) => {
    fetchProject()
    // If we have the updated task, show task details
    if (updatedTask) {
      setTimeout(() => {
        setSelectedTask(updatedTask)
        setTaskDetailsDialogOpen(true)
      }, 100)
    }
  }

  const handleTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  const handleEditTask = (task: Task) => {
    // Close the task-details sheet if it's open so the edit sheet has the focus.
    setTaskDetailsDialogOpen(false)
    setSelectedTask(task)
    setEditSheetOpen(true)
  }

  const handleTimeTracking = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(false)
    setTimeTrackingDialogOpen(true)
  }

  const handleDeleteTask = async (task: Task) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchProject() // Refresh the project data
      } else {
        const data = await response.json()
        alert(data.error || "Nie udało się usunąć zadania")
      }
    } catch (error) {
      console.error("Error deleting task:", error)
      alert("Wystąpił błąd podczas usuwania zadania")
    }
  }

  const canEditTask = (task?: Task) => {
    if (!session?.user?.id) return false

    // Admin can edit all tasks
    if (isAdmin) return true

    const projectMembers = getProjectMembers(project)

    // If no specific task provided, check if user is project member
    if (!task) {
      return projectMembers.some(member => member.id === session.user.id) || false
    }

    // User can edit if they are the assignee, creator, or project member
    return task.createdBy?.id === session.user.id ||
      task.assignee?.id === session.user.id ||
      projectMembers.some(member => member.id === session.user.id) || false
  }



  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }



  const getFilteredTasks = (tasks: Task[]) => {
    if (taskFilter === "all") return tasks
    if (taskFilter === "mine") {
      return tasks.filter(task => task.assignee?.id === session?.user?.id)
    }
    // Filter by specific user ID
    return tasks.filter(task => task.assignee?.id === taskFilter)
  }

  const getTaskCounts = (tasks: Task[]) => {
    const all = tasks.length
    const mine = tasks.filter(task => task.assignee?.id === session?.user?.id).length
    const byUser: Record<string, number> = {}

    // Count tasks for each project member
    const projectMembers = getProjectMembers(project)
    projectMembers.forEach(member => {
      byUser[member.id] = tasks.filter(task => task.assignee?.id === member.id).length
    })

    return { all, mine, byUser }
  }

  const handleFilterChange = (filter: "all" | "mine" | string) => {
    setTaskFilter(filter)
  }

  // Transform tasks to include project info for KanbanBoard
  const transformTasksForKanban = (tasks: Task[]) => {
    if (!project) return []
    const projectMembers = getProjectMembers(project)

    return tasks.map(task => ({
      ...task,
      project: {
        id: project.id,
        name: project.name,
        color: project.color
      },
      assignee: task.assignee ? {
        ...task.assignee,
        email: projectMembers.find(m => m.id === task.assignee?.id)?.email || ''
      } : undefined,
      createdBy: task.createdBy ? {
        ...task.createdBy,
        email: projectMembers.find(m => m.id === task.createdBy?.id)?.email || ''
      } : undefined,
      timeEntries: []
    }))
  }

  // Transform single task for TaskDetailsDialog
  const transformTaskForDialog = (task: Task | null) => {
    if (!task || !project) return null
    const projectMembers = getProjectMembers(project)

    return {
      ...task,
      project: {
        id: project.id,
        name: project.name,
      },
      assignee: task.assignee ? {
        ...task.assignee,
        email: projectMembers.find(m => m.id === task.assignee?.id)?.email || ''
      } : undefined,
      createdBy: task.createdBy ? {
        ...task.createdBy,
        email: projectMembers.find(m => m.id === task.createdBy?.id)?.email || ''
      } : undefined,
      timeEntries: task.timeEntries || [],
      images: task.images || []
    }
  }

  if (loading || !viewPreferencesLoaded) {
    return <PageLoadingLayout variant="details" />
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Projekt nie znaleziony</h3>
        <p className="text-gray-500 mb-4">Projekt, którego szukasz, nie istnieje lub nie masz do niego dostępu.</p>
        <Link href="/dashboard/projects">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć do projektów
          </Button>
        </Link>
      </div>
    )
  }



  return (
    <div
      className="space-y-6 p-4 md:p-8 pt-6 relative"
      id="tasks"
      style={{
        ...(project.imageUrl
          ? {
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.45)), url(${project.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
          }
          : {}),
      }}
    >

      {/* Tasks */}
      {viewMode === "list" ? (
        <div >
          <div>
            <div className="flex items-center justify-between">
              <div>
                <div>Zadania</div>
                <div>
                  {taskFilter === "all" ? "Wszystkie zadania w tym projekcie" :
                    taskFilter === "mine" ? "Twoje zadania w tym projekcie" :
                      `Zadania przypisane do ${getProjectMembers(project).find(m => m.id === taskFilter)?.name || "Nieznany użytkownik"}`}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <QuickAddTaskCommand
                  projectId={projectId}
                  onTaskCreated={fetchProject}
                  onOptimisticCreate={handleOptimisticCreate}
                  onOptimisticRollback={handleOptimisticRollback}
                />
                <TaskBoardFilters
                  currentUserId={session?.user?.id}
                  selectedFilter={taskFilter}
                  onFilterChange={handleFilterChange}
                  taskCounts={getTaskCounts(tasks)}
                />
                <Button onClick={handleCreateTask} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj zadanie
                </Button>
              </div>
            </div>
          </div>
          <div>
            {getFilteredTasks(tasks).length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {taskFilter === "all" ? "Brak zadań" :
                    taskFilter === "mine" ? "Brak zadań przypisanych do Ciebie" :
                      "Brak zadań przypisanych tej osobie"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {taskFilter === "all" ? "Utwórz swoje pierwsze zadanie, aby rozpocząć" :
                    taskFilter === "mine" ? "Brak zadań przypisanych Tobie w tym projekcie" :
                      "Ten członek zespołu nie ma przypisanych zadań w tym projekcie"}
                </p>
                <Button onClick={handleCreateTask}>
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz zadanie
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredTasks(tasks).map((task) => (
                  <div
                    key={task.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4"
                    style={{
                      borderLeftColor: project.color || '#3B82F6'
                    }}
                    onClick={() => handleTaskDetails(task)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{task.title}</h4>

                          {task.priority && (
                            <Badge className={getPriorityColor(task.priority)} variant="outline">
                              {task.priority === "high" ? "Wysoki" : task.priority === "medium" ? "Średni" : task.priority === "low" ? "Niski" : task.priority}
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-sm text-gray-600 mb-2" dangerouslySetInnerHTML={{ __html: task.description }} />
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {task.assignee && (
                            <div className="flex items-center space-x-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={task.assignee.avatarUrl ?? undefined} />
                                <AvatarFallback className="text-xs">
                                  {task.assignee.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span>{task.assignee.name}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Termin {formatTaskDueDateWithRelative(task.dueDate)}</span>
                            </div>
                          )}
                          {task.subtasks.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>{task.subtasks.filter((st: { isCompleted: boolean }) => st.isCompleted).length}/{task.subtasks.length} podzadań</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
        : viewMode === "daily" ? (
          <ProjectDailyView
            tasks={getFilteredTasks(tasks)}
            onTaskClick={handleTaskDetails}
            onCreateTask={handleCreateTask}
            onTaskCreated={fetchProject}
            onOptimisticCreate={handleOptimisticCreate}
            onOptimisticRollback={handleOptimisticRollback}
            projectId={projectId}
            onTaskUpdate={async (taskId: string, updates: { startTime?: string; endTime?: string; assigneeId?: string }) => {
              try {
                const response = await fetch(`/api/tasks/${taskId}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(updates),
                })

                if (!response.ok) {
                  throw new Error('Failed to update task')
                }

                // Refresh tasks
                handleTaskUpdated()
              } catch (error) {
                console.error('Error updating task:', error)
                throw error
              }
            }}
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Tablica zadań</h2>
                <p className="text-sm text-white">Przeciągnij zadania między kolumnami, aby zaktualizować ich status</p>
              </div>
              <div className="flex items-center space-x-2">
                <QuickAddTaskCommand
                  projectId={projectId}
                  onTaskCreated={fetchProject}
                  onOptimisticCreate={handleOptimisticCreate}
                  onOptimisticRollback={handleOptimisticRollback}
                />

              </div>
            </div>
            {getFilteredTasks(tasks).length === 0 ? (
              <Card >
                <CardContent className="py-12">
                  <div className="text-center">
                    <LayoutGrid className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {taskFilter === "all" ? "Brak zadań" :
                        taskFilter === "mine" ? "Brak zadań przypisanych do Ciebie" :
                          "Brak zadań przypisanych tej osobie"}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {taskFilter === "all" ? "Utwórz swoje pierwsze zadanie, aby zobaczyć tablicę" :
                        taskFilter === "mine" ? "Brak zadań przypisanych Tobie w tym projekcie" :
                          "Ten członek zespołu nie ma przypisanych zadań w tym projekcie"}
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
                projectId={projectId}
                tasks={transformTasksForKanban(getFilteredTasks(tasks))}
                onTaskUpdated={handleTaskUpdated}
                onTaskEdit={handleEditTask}
                onTimeTracking={handleTimeTracking}
                onTaskDelete={handleDeleteTask}
                canEditTask={canEditTask}
                onCreateTask={handleCreateTask}
              />
            )}
          </div>
        )}



      <TaskDetailsDialog
        open={taskDetailsDialogOpen}
        onOpenChange={setTaskDetailsDialogOpen}
        task={transformTaskForDialog(selectedTask)}
        onEdit={handleEditTask}
        onTimeTracking={handleTimeTracking}
        onDelete={handleDeleteTask}
        onTaskUpdated={handleTaskUpdated}
        canEdit={selectedTask ? canEditTask(selectedTask) : false}
      />

      <TaskDetailsDialog
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
        task={null}
        mode="create"
        projectId={projectId}
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
