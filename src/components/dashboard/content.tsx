"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { Plus, Users, FolderOpen, CheckSquare, Calendar } from "lucide-react"
import Link from "next/link"
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog"
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog"
import { TimeTrackingDialog } from "@/components/tasks/time-tracking-dialog"

interface DashboardStats {
  myTasks: number
  teams: number
  projects: number
  dueToday: number
}

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface TaskImage {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
  createdAt: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  statusId?: string
  priority?: string
  dueDate?: string
  estimatedHours?: number
  createdAt: string
  project: {
    id: string
    name: string
    team: {
      id: string
      name: string
    }
  }
  assignee?: User
  createdBy?: User
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
  timeEntries?: {
    id: string
    hours: number
    description?: string
    date: string
    user: User
  }[]
  images?: TaskImage[]
  todos?: {
    id: string
    title: string
    isCompleted: boolean
  }[]
}

export function DashboardContent() {
  const { data: session } = useSession() as { data: Session | null }
  const [stats, setStats] = useState<DashboardStats>({
    myTasks: 0,
    teams: 0,
    projects: 0,
    dueToday: 0
  })
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Task dialog states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false)
  const [timeTrackingDialogOpen, setTimeTrackingDialogOpen] = useState(false)
  const [teamMembers, setTeamMembers] = useState<User[]>([])

  const fetchDashboardData = useCallback(async () => {
    try {
      const [teamsRes, projectsRes, tasksRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/projects"),
        fetch(`/api/tasks?assigneeId=${session?.user?.id}`)
      ])

      const [teamsData, projectsData, tasksData] = await Promise.all([
        teamsRes.ok ? teamsRes.json() : { teams: [] },
        projectsRes.ok ? projectsRes.json() : { projects: [] },
        tasksRes.ok ? tasksRes.json() : { tasks: [] }
      ])

      const today = new Date().toISOString().split('T')[0]
      const dueToday = tasksData.tasks.filter((task: Task) =>
        task.dueDate && task.dueDate.split('T')[0] === today
      ).length

      setStats({
        myTasks: tasksData.tasks.length,
        teams: teamsData.teams.length,
        projects: projectsData.projects.length,
        dueToday
      })

      setRecentTasks(tasksData.tasks.slice(0, 5))

      // For dashboard view, we'll use an empty array for team members
      // In a real app, you might want to fetch team members from the user's teams
      setTeamMembers([])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData()
    }
  }, [session?.user?.id, fetchDashboardData])

  // Task dialog handlers
  const handleTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setEditTaskDialogOpen(true)
  }

  const handleTimeTracking = (task: Task) => {
    setSelectedTask(task)
    setTimeTrackingDialogOpen(true)
  }

  const canEditTask = (task: Task) => {
    return session?.user?.id === task.createdBy?.id || session?.user?.id === task.assignee?.id
  }

  const getTodoProgress = (task: Task) => {
    if (!task.todos || task.todos.length === 0) return null
    const completedTodos = task.todos.filter(todo => todo.isCompleted).length
    return {
      completed: completedTodos,
      total: task.todos.length
    }
  }

  const statsConfig = [
    {
      name: "Moje zadania",
      value: stats.myTasks.toString(),
      description: "Aktywne zadania przypisane do Ciebie",
      icon: CheckSquare,
      color: "text-blue-600",
      href: "/dashboard/tasks"
    },
    {
      name: "Zespoły",
      value: stats.teams.toString(),
      description: "Zespoły, do których należysz",
      icon: Users,
      color: "text-green-600",
      href: "/dashboard/teams"
    },
    {
      name: "Projekty",
      value: stats.projects.toString(),
      description: "Aktywne projekty",
      icon: FolderOpen,
      color: "text-purple-600",
      href: "/dashboard/projects"
    },
    {
      name: "Termin dzisiaj",
      value: stats.dueToday.toString(),
      description: "Zadania z terminem na dziś",
      icon: Calendar,
      color: "text-red-600",
      href: "/dashboard/calendar"
    },
  ]

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done":
        return "bg-green-100 text-green-800"
      case "In Progress":
        return "bg-blue-100 text-blue-800"
      case "To Do":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return "Brak terminu"
    const date = new Date(dueDate)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return "Dzisiaj"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Jutro"
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return <PageLoadingLayout variant="dashboard" />
  }

  return (
    <>
    <div>
              {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 bg-white">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div id="dynamic-header" className="flex flex-1" >
      {/* Welcome section */}
      <div id="page-header">
        <h1 className="text-2xl font-bold text-gray-900">
          Witaj ponownie, {session?.user?.name?.split(" ")[0] || "Użytkowniku"}!
        </h1>
        <p className="text-sm text-gray-500">
          Oto, co dzieje się z Twoimi projektami dzisiaj.
        </p>
      </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
    <div className="space-y-8">


      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsConfig.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-gray-500">
                    {stat.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Szybkie działania</CardTitle>
          <CardDescription>
            Rozpocznij od typowych zadań
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/tasks">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Utwórz zadanie
              </Button>
            </Link>
            <Link href="/dashboard/teams">
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Utwórz zespół
              </Button>
            </Link>
            <Link href="/dashboard/projects">
              <Button variant="outline">
                <FolderOpen className="mr-2 h-4 w-4" />
                Nowy projekt
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ostatnie zadania</CardTitle>
              <CardDescription>
                Twoja ostatnia aktywność w zadaniach
              </CardDescription>
            </div>
            <Link href="/dashboard/tasks">
              <Button variant="outline" size="sm">
                Wyświetl wszystko
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nie masz jeszcze przypisanych zadań</p>
              <Link href="/dashboard/tasks">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz swoje pierwsze zadanie
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTaskDetails(task)}
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {task.title}
                    </h4>
                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                      <span>{task.project.name}</span>
                      {task.subtasks.length > 0 && (
                        <span>
                          {task.subtasks.filter(st => st.isCompleted).length}/{task.subtasks.length} subtasks
                        </span>
                      )}
                      {getTodoProgress(task) && (
                        <span>
                          {getTodoProgress(task)!.completed}/{getTodoProgress(task)!.total} todos
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {task.priority && (
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority === "High" ? "Wysoki" : task.priority === "Medium" ? "Średni" : "Niski"}
                      </Badge>
                    )}
                    <Badge className={getStatusColor(task.status)}>
                      {task.status === "Done" ? "Ukończono" : task.status === "In Progress" ? "W toku" : "Do zrobienia"}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDueDate(task.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
    </main>
    </div>

    {/* Task Details Dialog */}
    <TaskDetailsDialog
      open={taskDetailsDialogOpen}
      onOpenChange={setTaskDetailsDialogOpen}
      task={selectedTask as Task}
      onEdit={handleEditTask}
      onTimeTracking={handleTimeTracking}
      canEdit={selectedTask ? canEditTask(selectedTask) : false}
    />

    {/* Edit Task Dialog */}
    <EditTaskDialog
      open={editTaskDialogOpen}
      onOpenChange={setEditTaskDialogOpen}
      task={selectedTask as Task}
      onTaskUpdated={fetchDashboardData}
      teamMembers={teamMembers}
    />

    {/* Time Tracking Dialog */}
    <TimeTrackingDialog
      open={timeTrackingDialogOpen}
      onOpenChange={setTimeTrackingDialogOpen}
      task={selectedTask as Task}
      onTimeLogged={fetchDashboardData}
    />
    </>
  )
}
