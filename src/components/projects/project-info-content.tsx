"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Users,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react"
import Link from "next/link"

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

interface ProjectInfoContentProps {
  projectId: string
}

export function ProjectInfoContent({ projectId }: ProjectInfoContentProps) {
  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
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

    fetchProject()
  }, [projectId, router])

  const getTaskStats = (tasks: ProjectDetails['tasks']) => {
    const total = tasks.length
    const completed = tasks.filter(task => task.status.toLowerCase() === "done").length
    const inProgress = tasks.filter(task => task.status.toLowerCase() === "in progress").length
    const overdue = tasks.filter(task =>
      task.dueDate && new Date(task.dueDate) < new Date() && task.status.toLowerCase() !== "done"
    ).length

    return { total, completed, inProgress, overdue }
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div id="page-header"  className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
        <p className="text-gray-500 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/projects">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    )
  }

  const stats = getTaskStats(project.tasks)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div id="page-header"  className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Information</h1>
            <p className="text-gray-500">{project.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
        </div>
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Project Overview</span>
          </CardTitle>
          <CardDescription>Basic information about this project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Name</h4>
            <p className="text-sm text-gray-900">{project.name}</p>
          </div>
          {project.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
              <p className="text-sm text-gray-900">{project.description}</p>
            </div>
          )}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Status</h4>
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Created</h4>
            <p className="text-sm text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Last Updated</h4>
            <p className="text-sm text-gray-900">{new Date(project.updatedAt).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Project Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.team.name}</div>
            <p className="text-xs text-muted-foreground">
              {project.team.members.length} member{project.team.members.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}/{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>People working on this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {project.team.members.map((member) => (
              <div key={member.id} className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={member.avatarUrl} />
                  <AvatarFallback>
                    {member.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Task Summary</CardTitle>
          <CardDescription>Detailed breakdown of project tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-sm text-gray-500">Total Tasks</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
