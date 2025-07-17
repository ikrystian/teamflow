"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"

import {
  ArrowLeft,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  List,
  LayoutGrid,
  Settings,
  Info
} from "lucide-react"
import Link from "next/link"
import { CreateTaskDialog } from "./create-task-dialog"
import { KanbanBoard } from "./kanban-board"
import { TaskDetailsDialog } from "../tasks/task-details-dialog"
import { EditTaskDialog } from "../tasks/edit-task-dialog"
import { TimeTrackingDialog } from "../tasks/time-tracking-dialog"
import { TaskBoardFilters } from "./task-board-filters"
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

interface ProjectDetails {
  id: string
  name: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string
  team: {
    id: string
    name: string
    members: {
      id: string
      name: string
      email: string
      avatarUrl?: string
    }[]
  }
  tasks: {
    id: string
    title: string
    description?: string
    status: string
    priority?: string
    dueDate?: string
    createdAt: string
    assignee?: {
      id: string
      name: string
      avatarUrl?: string
    }
    subtasks: {
      id: string
      title: string
      isCompleted: boolean
    }[]
    comments: {
      id: string
      content: string
      createdAt: string
      author: {
        id: string
        name: string
        avatarUrl?: string
      }
    }[]
  }[]
}

interface ProjectDetailsContentProps {
  projectId: string
}

export function ProjectDetailsContent({ projectId }: ProjectDetailsContentProps) {
  const { data: session } = useSession() as { data: Session | null }
  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false)
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false)
  const [timeTrackingDialogOpen, setTimeTrackingDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"list" | "board">("list")
  const [taskFilter, setTaskFilter] = useState<"all" | "mine" | string>("all")
  const [deletingTask, setDeletingTask] = useState(false)
  const router = useRouter()

  const fetchProject = async () => {
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
  }

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const handleTaskCreated = () => {
    fetchProject()
    setCreateTaskDialogOpen(false)
  }

  const handleTaskUpdated = () => {
    fetchProject()
  }

  const handleTaskDetails = (task: any) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  const handleEditTask = (task: any) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(false)
    setEditTaskDialogOpen(true)
  }

  const handleTimeTracking = (task: any) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(false)
    setTimeTrackingDialogOpen(true)
  }

  const handleDeleteTask = (task: any) => {
    setSelectedTask(task)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteTask = async () => {
    if (!selectedTask) return

    setDeletingTask(true)
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchProject() // Refresh the project data
        setDeleteDialogOpen(false)
        setSelectedTask(null)
      } else {
        const data = await response.json()
        alert(data.error || "Nie udało się usunąć zadania")
      }
    } catch (error) {
      console.error("Error deleting task:", error)
      alert("Wystąpił błąd podczas usuwania zadania")
    } finally {
      setDeletingTask(false)
    }
  }

  const canEditTask = (task: any) => {
    // User can edit if they are the assignee, creator, or team member
    return true // Simplified for now
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in progress":
        return "bg-blue-100 text-blue-800"
      case "on hold":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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

  const getTaskStats = (tasks: ProjectDetails['tasks']) => {
    const total = tasks.length
    const completed = tasks.filter(task => task.status.toLowerCase() === "done").length
    const inProgress = tasks.filter(task => task.status.toLowerCase() === "in progress").length
    const overdue = tasks.filter(task =>
      task.dueDate && new Date(task.dueDate) < new Date() && task.status.toLowerCase() !== "done"
    ).length

    return { total, completed, inProgress, overdue }
  }

  const getFilteredTasks = (tasks: ProjectDetails['tasks']) => {
    if (taskFilter === "all") return tasks
    if (taskFilter === "mine") {
      return tasks.filter(task => task.assignee?.id === session?.user?.id)
    }
    // Filter by specific user ID
    return tasks.filter(task => task.assignee?.id === taskFilter)
  }

  const getTaskCounts = (tasks: ProjectDetails['tasks']) => {
    const all = tasks.length
    const mine = tasks.filter(task => task.assignee?.id === session?.user?.id).length
    const byUser: Record<string, number> = {}

    // Count tasks for each team member
    if (project?.team.members) {
      project.team.members.forEach(member => {
        byUser[member.id] = tasks.filter(task => task.assignee?.id === member.id).length
      })
    }

    return { all, mine, byUser }
  }

  const handleFilterChange = (filter: "all" | "mine" | string) => {
    setTaskFilter(filter)
  }

  // Transform tasks to include project info for KanbanBoard
  const transformTasksForKanban = (tasks: ProjectDetails['tasks']) => {
    return tasks.map(task => ({
      ...task,
      project: {
        id: project?.id || '',
        name: project?.name || ''
      },
      assignee: task.assignee ? {
        ...task.assignee,
        email: project?.team.members.find(m => m.id === task.assignee?.id)?.email || ''
      } : undefined,
      createdBy: task.assignee ? {
        ...task.assignee,
        email: project?.team.members.find(m => m.id === task.assignee?.id)?.email || ''
      } : undefined,
      timeEntries: [] // Add empty array for compatibility
    }))
  }

  // Transform single task for TaskDetailsDialog
  const transformTaskForDialog = (task: any) => {
    if (!task || !project) return null

    return {
      ...task,
      project: {
        id: project.id,
        name: project.name,
        team: {
          id: project.team.id,
          name: project.team.name
        }
      },
      assignee: task.assignee ? {
        ...task.assignee,
        email: project.team.members.find(m => m.id === task.assignee?.id)?.email || ''
      } : undefined,
      createdBy: task.assignee ? {
        ...task.assignee,
        email: project.team.members.find(m => m.id === task.assignee?.id)?.email || ''
      } : undefined,
      timeEntries: task.timeEntries || [],
      images: task.images || []
    }
  }

  if (loading) {
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

  const stats = getTaskStats(project.tasks);

  return (
        <div>
              {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div id="dynamic-header" className="flex flex-1" >
      <div id="page-header" className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500">{project.description || "Brak opisu"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(project.status)}>
            {project.status}
          </Badge>

          {/* View Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "board" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("board")}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
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

          <Button onClick={() => setCreateTaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj zadanie
          </Button>
        </div>
      </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
    <div  className="space-y-6">
      {/* Header */}




      {/* Tasks */}
      {viewMode === "list" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Zadania</CardTitle>
                <CardDescription>
                  {taskFilter === "all" ? "Wszystkie zadania w tym projekcie" :
                   taskFilter === "mine" ? "Twoje zadania w tym projekcie" :
                   `Zadania przypisane do ${project.team.members.find(m => m.id === taskFilter)?.name || "Nieznany użytkownik"}`}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <TaskBoardFilters
                  teamMembers={project.team.members}
                  currentUserId={session?.user?.id}
                  selectedFilter={taskFilter}
                  onFilterChange={handleFilterChange}
                  taskCounts={getTaskCounts(project.tasks)}
                />
                <Button onClick={() => setCreateTaskDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj zadanie
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {getFilteredTasks(project.tasks).length === 0 ? (
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
                <Button onClick={() => setCreateTaskDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz zadanie
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredTasks(project.tasks).map((task) => (
                  <div
                    key={task.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleTaskDetails(task)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge className={getStatusColor(task.status)} variant="secondary">
                            {task.status === "completed" ? "Ukończono" : task.status === "in progress" ? "W toku" : task.status === "on hold" ? "Wstrzymano" : task.status}
                          </Badge>
                          {task.priority && (
                            <Badge className={getPriorityColor(task.priority)} variant="outline">
                              {task.priority === "high" ? "Wysoki" : task.priority === "medium" ? "Średni" : task.priority === "low" ? "Niski" : task.priority}
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {task.assignee && (
                            <div className="flex items-center space-x-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={task.assignee.avatarUrl} />
                                <AvatarFallback className="text-xs">
                                  {task.assignee.name?.split(' ').map(n => n[0]).join('') || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span>{task.assignee.name}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Termin {new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>{task.subtasks.filter(st => st.isCompleted).length}/{task.subtasks.length} podzadań</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Tablica zadań</h2>
              <p className="text-sm text-gray-500">Przeciągnij zadania między kolumnami, aby zaktualizować ich status</p>
            </div>
            <TaskBoardFilters
              teamMembers={project.team.members}
              currentUserId={session?.user?.id}
              selectedFilter={taskFilter}
              onFilterChange={handleFilterChange}
              taskCounts={getTaskCounts(project.tasks)}
            />
          </div>
          {getFilteredTasks(project.tasks).length === 0 ? (
            <Card>
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
                  <Button onClick={() => setCreateTaskDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Utwórz zadanie
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <KanbanBoard
              projectId={projectId}
              tasks={transformTasksForKanban(getFilteredTasks(project.tasks))}
              onTaskUpdated={handleTaskUpdated}
              onTaskEdit={handleEditTask}
              onTimeTracking={handleTimeTracking}
              onTaskDelete={handleDeleteTask}
              canEditTask={canEditTask}
            />
          )}
        </div>
      )}

      <CreateTaskDialog
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
        onTaskCreated={handleTaskCreated}
        projectId={projectId}
        teamMembers={project.team.members}
      />

      <TaskDetailsDialog
        open={taskDetailsDialogOpen}
        onOpenChange={setTaskDetailsDialogOpen}
        task={transformTaskForDialog(selectedTask)}
        onEdit={handleEditTask}
        onTimeTracking={handleTimeTracking}
        onDelete={handleDeleteTask}
        canEdit={selectedTask ? canEditTask(selectedTask) : false}
      />

      <EditTaskDialog
        open={editTaskDialogOpen}
        onOpenChange={setEditTaskDialogOpen}
        onTaskUpdated={handleTaskUpdated}
        task={selectedTask}
        teamMembers={project.team.members}
      />

      <TimeTrackingDialog
        open={timeTrackingDialogOpen}
        onOpenChange={setTimeTrackingDialogOpen}
        onTimeLogged={handleTaskUpdated}
        task={selectedTask}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń zadanie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć zadanie &quot;{selectedTask?.title}&quot;?
              Ta operacja jest nieodwracalna i usunie również wszystkie podzadania, komentarze i wpisy czasu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              disabled={deletingTask}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingTask ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
    </main>
    </div>
  )
}
