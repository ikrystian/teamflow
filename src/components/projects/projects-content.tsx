"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { Plus, FolderOpen, Calendar, Users } from "lucide-react"
import { CreateProjectDialog } from "./create-project-dialog"
import Link from "next/link"

interface Project {
  id: string
  name: string
  description?: string
  status: string
  createdAt: string
  team: {
    id: string
    name: string
  }
  tasks: {
    id: string
    title: string
    status: string
    priority?: string
    dueDate?: string
    assignee?: {
      id: string
      name: string
      avatarUrl?: string
    }
  }[]
}

interface Team {
  id: string
  name: string
}

export function ProjectsContent() {
  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

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

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams")
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams)
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchProjects(), fetchTeams()])
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleProjectCreated = () => {
    fetchProjects()
    setCreateDialogOpen(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800"
      case "In Progress":
        return "bg-blue-100 text-blue-800"
      case "On Hold":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTaskStats = (tasks: Project["tasks"]) => {
    const total = tasks.length
    const completed = tasks.filter(task => task.status === "Done").length
    const inProgress = tasks.filter(task => task.status === "In Progress").length
    return { total, completed, inProgress }
  }

  if (loading) {
    return <PageLoadingLayout variant="list" showTopBar={false} />
  }

  return (
        <div>
              {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div id="dynamic-header" className="flex flex-1" >
      <div id="page-header"className="flex justify-between items-center w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projekty</h1>
          <p className="text-gray-500">Zarządzaj swoimi projektami i śledź postępy</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} disabled={teams.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Utwórz projekt
        </Button>
      </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">

    <div  className="space-y-6">


      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak dostępnych zespołów</h3>
            <p className="text-gray-500 text-center mb-4">
              Musisz utworzyć lub dołączyć do zespołu, zanim będziesz mógł tworzyć projekty
            </p>
            <Link href="/dashboard/teams">
              <Button>
                <Users className="mr-2 h-4 w-4" />
                Przejdź do zespołów
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak projektów</h3>
            <p className="text-gray-500 text-center mb-4">
              Utwórz swój pierwszy projekt, aby rozpocząć organizowanie zadań i współpracę
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Utwórz projekt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const stats = getTaskStats(project.tasks)
            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {project.description || "Brak opisu"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {project.team.name}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Postęp zadań</span>
                          <span className="font-medium">
                            {stats.completed}/{stats.total}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%'
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{stats.completed} ukończono</span>
                          <span>{stats.inProgress} w toku</span>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        Utworzono {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProjectCreated={handleProjectCreated}
        teams={teams}
      />
    </div>
    </div>
    </main>
    </div>
  )
}
