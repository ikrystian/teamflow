"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, CheckSquare, Calendar, User, Filter } from "lucide-react"
import { CreateTaskDialog } from "./create-task-dialog"

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  dueDate?: string
  createdAt: string
  project: {
    id: string
    name: string
    team: {
      id: string
      name: string
    }
  }
  assignee?: {
    id: string
    name: string
    email: string
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
}

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
  const [filter, setFilter] = useState<"all" | "assigned">("assigned")

  const fetchTasks = async () => {
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
  }

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
  }, [filter, session?.user?.id])

  const handleTaskCreated = () => {
    fetchTasks()
    setCreateDialogOpen(false)
  }

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
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {filter === "assigned" ? "My Tasks" : "All Tasks"}
          </h1>
          <p className="text-gray-500">
            {filter === "assigned"
              ? "Tasks assigned to you across all projects"
              : "All tasks you have access to"
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "assigned" ? "default" : "outline"}
            onClick={() => setFilter("assigned")}
            size="sm"
          >
            <User className="mr-2 h-4 w-4" />
            My Tasks
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            <Filter className="mr-2 h-4 w-4" />
            All Tasks
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} disabled={projects.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects available</h3>
            <p className="text-gray-500 text-center mb-4">
              You need to have projects before you can create tasks
            </p>
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === "assigned" ? "No tasks assigned to you" : "No tasks found"}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {filter === "assigned"
                ? "You don't have any tasks assigned to you yet"
                : "No tasks have been created yet"
              }
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {task.project.name} • {task.project.team.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {task.priority && (
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    )}
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {task.assignee && (
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assignee.avatarUrl} alt={task.assignee.name} />
                            <AvatarFallback className="text-xs">
                              {task.assignee.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600">{task.assignee.name}</span>
                        </div>
                      )}

                      {task.subtasks.length > 0 && (
                        <div className="text-sm text-gray-600">
                          {task.subtasks.filter(st => st.isCompleted).length}/{task.subtasks.length} subtasks
                        </div>
                      )}
                    </div>

                    {task.dueDate && (
                      <div className={`flex items-center space-x-1 text-sm ${
                        isOverdue(task.dueDate) ? "text-red-600" : "text-gray-600"
                      }`}>
                        <Calendar className="h-4 w-4" />
                        <span>{formatDueDate(task.dueDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={handleTaskCreated}
        projects={projects}
      />
    </div>
  )
}
