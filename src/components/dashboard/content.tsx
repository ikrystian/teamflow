"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { Plus, CheckSquare, Calendar } from "lucide-react"
import Link from "next/link"
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet"
import { TaskFormSheet } from "@/components/shared/task-form-sheet"
import { TimeTrackingSheet } from "@/components/tasks/time-tracking-sheet"
import { usePageHeader } from "@/contexts/header-context"
import type { Task, User } from "@/types"

interface DashboardStats {
  myTasks: number
  teams: number
  projects: number
  dueToday: number
}

export function DashboardContent() {
  const { data: session } = useSession() as { data: Session | null }

  // Set page header content
  usePageHeader(
    <div>
      <h1 className="text-2xl font-bold text-foreground">
        {session?.user?.name?.split(" ")[0] || "Użytkowniku"}, oto, co dzieje się z Twoimi projektami dzisiaj.
      </h1>
    </div>,
    [session?.user?.name] // Only re-render when user name changes
  )

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
        fetch("/api/projects?includeArchived=false"),
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
      color: "text-blue-600 dark:text-blue-400",
      href: "/dashboard/tasks"
    },
    {
      name: "Termin dzisiaj",
      value: stats.dueToday.toString(),
      description: "Zadania z terminem na dziś",
      icon: Calendar,
      color: "text-red-600 dark:text-red-400",
      href: "/dashboard/calendar"
    },
  ]

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
      <div className="space-y-8 p-4 md:p-8 pt-6">


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
                      <dt className="text-sm font-medium text-muted-foreground truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-foreground">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground">
                    {stat.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

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
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/tasks">
                Wyświetl wszystko
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nie masz jeszcze przypisanych zadań</p>
              <Button asChild>
                <Link href="/dashboard/tasks">
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz swoje pierwsze zadanie
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors border-l-4"
                  style={{
                    borderLeftColor: task.project?.color || '#3B82F6'
                  }}
                  onClick={() => handleTaskDetails(task)}
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground">
                      {task.title}
                    </h4>
                    <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                      <span>{task?.project?.name}</span>
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

                    <span className="text-sm text-muted-foreground">
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

    {/* Task Details Sheet */}
    <TaskDetailsSheet
      open={taskDetailsDialogOpen}
      onOpenChange={setTaskDetailsDialogOpen}
      task={selectedTask as Task}
      onEdit={handleEditTask}
      onTimeTracking={handleTimeTracking}
      canEdit={selectedTask ? canEditTask(selectedTask) : false}
    />

    {/* Edit Task Sheet */}
    <TaskFormSheet
      mode="edit"
      open={editTaskDialogOpen}
      onOpenChange={setEditTaskDialogOpen}
      task={selectedTask as Task}
      onTaskUpdated={fetchDashboardData}
      teamMembers={teamMembers}
    />

    {/* Time Tracking Sheet */}
    <TimeTrackingSheet
      open={timeTrackingDialogOpen}
      onOpenChange={setTimeTrackingDialogOpen}
      task={selectedTask as Task}
      onTimeLogged={fetchDashboardData}
    />
    </>
  )
}
