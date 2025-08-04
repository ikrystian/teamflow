"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Zap,
  LayoutGrid,
  Calendar as CalendarIcon,
  Users,
  Clock,
  AlertCircle,
  Eye
} from "lucide-react"
import { ReadOnlyKanbanBoard } from "@/components/public/read-only-kanban-board"
import { ReadOnlyTaskCalendar } from "@/components/public/read-only-task-calendar"
import { ReadOnlyTaskDetails } from "@/components/public/read-only-task-details"
import type { Task, TaskStatus } from "@/types"

interface ProjectData {
  project: {
    id: string
    name: string
    description?: string
    color: string
    icon?: string
    imageUrl?: string
    team: {
      id: string
      name: string
    }
    createdAt: string
    updatedAt: string
  }
  tasks: Task[]
  taskStatuses: TaskStatus[]
}

export default function PublicProjectPage() {
  const params = useParams()
  const shareToken = params.shareToken as string

  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false)

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/public/projects/${shareToken}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError("Projekt nie został znaleziony lub udostępnianie zostało wyłączone.")
          } else {
            setError("Wystąpił błąd podczas ładowania projektu.")
          }
          return
        }

        const data = await response.json()
        setProjectData(data)
      } catch (error) {
        console.error("Error fetching project data:", error)
        setError("Wystąpił błąd podczas ładowania projektu.")
      } finally {
        setLoading(false)
      }
    }

    if (shareToken) {
      fetchProjectData()
    }
  }, [shareToken])

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Ładowanie projektu...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h1 className="text-xl font-semibold">Nie można załadować projektu</h1>
                <p className="text-muted-foreground mt-2">
                  {error || "Wystąpił nieoczekiwany błąd."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { project, tasks, taskStatuses } = projectData

  // Calculate project statistics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task =>
    task.taskStatus?.name.toLowerCase().includes('done') ||
    task.taskStatus?.name.toLowerCase().includes('completed')
  ).length
  const tasksWithDueDate = tasks.filter(task => task.dueDate).length
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false
    return new Date(task.dueDate) < new Date() &&
           !task.taskStatus?.name.toLowerCase().includes('done') &&
           !task.taskStatus?.name.toLowerCase().includes('completed')
  }).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Nexus</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                {project.icon && (
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: project.color }}
                  >
                    {project.icon}
                  </div>
                )}
                <div>
                  <h1 className="font-semibold">{project.name}</h1>
                  <p className="text-sm text-muted-foreground">{project.team.name}</p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Widok publiczny
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Project Info */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Wszystkie zadania</p>
                    <p className="text-2xl font-bold">{totalTasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ukończone</p>
                    <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Z terminem</p>
                    <p className="text-2xl font-bold">{tasksWithDueDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Przeterminowane</p>
                    <p className="text-2xl font-bold text-red-600">{overdueTasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Project Description */}
        {project.description && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Opis projektu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {project.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tasks Views */}
        <Tabs defaultValue="kanban" className="space-y-4">
          <TabsList>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Tablica Kanban
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Kalendarz
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tablica zadań</CardTitle>
              </CardHeader>
              <CardContent>
                <ReadOnlyKanbanBoard
                  tasks={tasks}
                  taskStatuses={taskStatuses}
                  onTaskClick={handleTaskClick}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <ReadOnlyTaskCalendar
              tasks={tasks}
              onTaskClick={handleTaskClick}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Task Details Dialog */}
      <ReadOnlyTaskDetails
        open={taskDetailsOpen}
        onOpenChange={setTaskDetailsOpen}
        task={selectedTask}
      />

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4" />
              <span>Powered by Nexus</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Ostatnia aktualizacja: {new Date(project.updatedAt).toLocaleDateString('pl-PL')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
