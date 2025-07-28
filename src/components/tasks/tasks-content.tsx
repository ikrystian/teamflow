"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClickableAvatar } from "@/components/ui/clickable-avatar"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, CheckSquare, Calendar, User as UserIcon, Filter, Edit, Clock, MoreHorizontal, Trash2, LayoutGrid, List } from "lucide-react"
import { CreateTaskDialog } from "./create-task-dialog"
import { EditTaskDialog } from "./edit-task-dialog"
import { TimeTrackingDialog } from "./time-tracking-dialog"
import { TaskDetailsDialog } from "./task-details-dialog"
import { TasksKanbanBoard } from "./tasks-kanban-board"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import type { Task, User } from "@/types"

interface Project {
  id: string
  name: string
  team: {
    id: string
    name: string
  }
}

export function TasksContent() {
  const { data: session } = useSession() as { data: Session | null }
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [timeTrackingDialogOpen, setTimeTrackingDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [filter, setFilter] = useState<"all" | "assigned">("assigned")
  const [deletingTask, setDeletingTask] = useState(false)
  const [activeTab, setActiveTab] = useState("board")

  const fetchTasks = useCallback(async () => {
    try {
      const url = filter === "assigned"
        ? `/api/tasks?assigneeId=${session?.user?.id}`
        : "/api/tasks"

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    }
  }, [filter, session?.user?.id])

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchTasks(), fetchProjects()])
      setLoading(false)
    }
    fetchData()
  }, [filter, session?.user?.id, fetchTasks])

  const handleTaskCreated = () => {
    fetchTasks()
    setCreateDialogOpen(false)
  }

  const handleEditTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    // Fetch team members for the task's project
    try {
      const response = await fetch(`/api/teams/${task.project.team.id}/members`)
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.members)
      }
    } catch (error) {
      console.error("Error fetching team members:", error)
    }

    setSelectedTask(task)
    setEditDialogOpen(true)
  }

  const handleTaskUpdated = () => {
    fetchTasks()
    setEditDialogOpen(false)
    setSelectedTask(null)
  }

  const handleTimeTracking = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTask(task)
    setTimeTrackingDialogOpen(true)
  }

  const handleTimeLogged = () => {
    fetchTasks() // Refresh to get updated time data
  }

  const handleDeleteTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
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
        fetchTasks() // Refresh the task list
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

  const handleTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setDetailsDialogOpen(true)
  }

  const canEditTask = (task: Task) => {
    if (!session?.user?.id) return false
    return task.createdBy?.id === session.user.id || task.assignee?.id === session.user.id
  }

  const getTotalTimeSpent = (task: Task) => {
    if (!task.timeEntries) return 0
    return task.timeEntries.reduce((total, entry) => total + entry.hours, 0)
  }

  const formatHours = (hours: number) => {
    if (!hours || hours === 0) return "0m"
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0 && m === 0) return "0m";

    let result = '';
    if (h > 0) {
      result += `${h}h`;
    }
    if (m > 0) {
      if (result) result += ' ';
      result += `${m}m`;
    }
    return result;
  }

  const getTodoProgress = (task: Task) => {
    if (!task.todos || task.todos.length === 0) return null
    const completedTodos = task.todos.filter(todo => todo.isCompleted).length
    return {
      completed: completedTodos,
      total: task.todos.length
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-destructive/10 text-destructive"
      case "Medium":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
      case "Low":
        return "bg-green-500/10 text-green-600 dark:text-green-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done":
        return "bg-green-500/10 text-green-600 dark:text-green-400"
      case "In Progress":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      case "To Do":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow"
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return <PageLoadingLayout variant="list" />
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {filter === "assigned" ? "Moje zadania" : "Wszystkie zadania"}
          </h2>
          <p className="text-muted-foreground">
            {filter === "assigned"
              ? "Zadania przypisane do Ciebie we wszystkich projektach"
              : "Wszystkie zadania do których masz dostęp"
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={filter === "assigned" ? "default" : "outline"}
            onClick={() => setFilter("assigned")}
            size="sm"
          >
            <UserIcon className="mr-2 h-4 w-4" />
            Moje zadania
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            <Filter className="mr-2 h-4 w-4" />
            Wszystkie
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} disabled={projects.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Utwórz zadanie
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="board" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Tablica
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Kalendarz
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="board" className="space-y-4">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center text-center py-16">
                <LayoutGrid className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {filter === "all" ? "Brak zadań" :
                   filter === "assigned" ? "Brak zadań przypisanych do Ciebie" :
                   "Brak zadań"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  {filter === "all" ? "Utwórz swoje pierwsze zadanie, aby zobaczyć tablicę" :
                   filter === "assigned" ? "Brak zadań przypisanych Tobie" :
                   "Brak zadań do wyświetlenia"}
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz zadanie
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TasksKanbanBoard
              tasks={tasks}
              onTaskUpdated={fetchTasks}
              onTaskEdit={(task) => handleTaskEdit(task, { stopPropagation: () => {} } as React.MouseEvent)}
              onTimeTracking={(task) => handleTimeTracking(task, { stopPropagation: () => {} } as React.MouseEvent)}
              onTaskDelete={(task) => handleDeleteTask(task, { stopPropagation: () => {} } as React.MouseEvent)}
              canEditTask={canEditTask}
              projects={projects}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Widok kalendarza</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Tutaj będzie wyświetlany kalendarz z zadaniami według terminów wykonania
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <PageLoadingLayout variant="list" />
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center text-center py-16">
                <CheckSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Brak dostępnych projektów</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Musisz mieć projekty, aby móc tworzyć zadania
                </p>
              </CardContent>
            </Card>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center text-center py-16">
                <CheckSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {filter === "assigned" ? "Brak przypisanych zadań" : "Brak zadań"}
                </h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  {filter === "assigned"
                    ? "Nie masz jeszcze przypisanych żadnych zadań."
                    : "Nie utworzono jeszcze żadnych zadań."
                  }
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz zadanie
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className="transition-all hover:shadow-md cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
                  onClick={() => handleTaskDetails(task)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold truncate">{task.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span>{task.project.name}</span>
                          <span>•</span>
                          <span>{task.project.team.name}</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {task.priority && (
                          <Badge variant="outline" className={getPriorityColor(task.priority)}>
                            {task.priority === "Low" ? "Niski" : task.priority === "Medium" ? "Średni" : "Wysoki"}
                          </Badge>
                        )}
                        <Badge variant="secondary" className={getStatusColor(task.status)}>
                          {task.status === "completed" ? "Ukończono" :
                           task.status === "in progress" ? "W toku" :
                           task.status === "on hold" ? "Wstrzymano" : task.status}
                        </Badge>

                        {/* Action Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleTimeTracking(task, e)}>
                              <Clock className="mr-2 h-4 w-4" />
                              Loguj czas
                            </DropdownMenuItem>
                            {canEditTask(task) && (
                              <DropdownMenuItem onClick={(e) => handleEditTask(task, e)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edytuj zadanie
                              </DropdownMenuItem>
                            )}
                            {canEditTask(task) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => handleDeleteTask(task, e)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Usuń zadanie
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {task.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {task.assignee && (
                            <div className="flex items-center space-x-2">
                              <ClickableAvatar
                                userId={task.assignee.id}
                                avatarUrl={task.assignee.avatarUrl}
                                name={task.assignee.name}
                                size="md"
                              />
                              <span className="text-sm text-muted-foreground">{task.assignee.name}</span>
                            </div>
                          )}

                          {task.subtasks.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {task.subtasks.filter(st => st.isCompleted).length}/{task.subtasks.length} podzadania
                            </div>
                          )}

                          {getTodoProgress(task) && (
                            <div className="text-sm text-muted-foreground">
                              {getTodoProgress(task)!.completed}/{getTodoProgress(task)!.total} zadania do wykonania
                            </div>
                          )}

                          {/* Time tracking info */}
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{formatHours(getTotalTimeSpent(task))}</span>
                            {task.estimatedHours && (
                              <span className="text-muted-foreground/70">
                                / {formatHours(task.estimatedHours)} planowane
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {task.dueDate && (
                            <div className={`flex items-center space-x-1 text-sm ${
                              isOverdue(task.dueDate) ? "text-destructive" : "text-muted-foreground"
                            }`}>
                              <Calendar className="h-4 w-4" />
                              <span>{formatDueDate(task.dueDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={handleTaskCreated}
        projects={projects}
      />

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onTaskUpdated={handleTaskUpdated}
        task={selectedTask}
        teamMembers={teamMembers}
      />

      <TimeTrackingDialog
        open={timeTrackingDialogOpen}
        onOpenChange={setTimeTrackingDialogOpen}
        onTimeLogged={handleTimeLogged}
        task={selectedTask}
      />

      <TaskDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        task={selectedTask as Task | null}
        onEdit={handleEditTask}
        onTimeTracking={handleTimeTracking}
        onDelete={handleDeleteTask}
        onTaskUpdated={fetchTasks}
        canEdit={selectedTask ? canEditTask(selectedTask) : false}
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
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingTask ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
