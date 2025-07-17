"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import {
  ArrowLeft,
  Users,
  CheckCircle,
  AlertCircle,
  Info,
  Key,
  FileText,
  ExternalLink,
  Edit
} from "lucide-react"
import Link from "next/link"
import { FileUpload } from "@/components/ui/file-upload"

interface ProjectDetails {
  id: string
  name: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string

  // Access credentials fields
  repositoryUrl?: string
  databaseUrl?: string
  serverUrl?: string
  apiUrl?: string
  adminPanelUrl?: string
  stagingUrl?: string
  productionUrl?: string
  credentials?: string

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
  documents?: {
    id: string
    filename: string
    url: string
    mimeType: string
    size: number
    description?: string
    category?: string
    createdAt: string
    uploadedBy: {
      id: string
      name: string
      email: string
      avatarUrl?: string
    }
  }[]
}

interface ProjectInfoContentProps {
  projectId: string
}

export function ProjectInfoContent({ projectId }: ProjectInfoContentProps) {
  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<ProjectDetails['documents']>([])
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

    const fetchDocuments = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/documents`)
        if (response.ok) {
          const data = await response.json()
          setDocuments(data.documents || [])
        }
      } catch (error) {
        console.error("Error fetching documents:", error)
      }
    }

    fetchProject()
    fetchDocuments()
  }, [projectId, router])

  const handleFileUpload = async (file: File, description?: string, category?: string) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (description) formData.append('description', description)
      if (category) formData.append('category', category)

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(prev => [data.document, ...(prev || [])])
      } else {
        console.error('Failed to upload document')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
    }
  }

  const handleFileDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documents?documentId=${fileId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDocuments(prev => prev?.filter(doc => doc.id !== fileId) || [])
      } else {
        console.error('Failed to delete document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const handleFileDownload = (file: { url: string, filename: string }) => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  const stats = getTaskStats(project.tasks)

  return (
        <div>
              {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 bg-white">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div id="dynamic-header" className="flex flex-1" >
      <div id="page-header"  className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Informacje o projekcie</h1>
            <p className="text-gray-500">{project.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
        </div>
      </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">

    <div className="space-y-6">
      {/* Header */}


      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Przegląd projektu</span>
          </CardTitle>
          <CardDescription>Podstawowe informacje o tym projekcie</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Project Name */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h4 className="text-sm font-medium text-muted-foreground">Nazwa projektu</h4>
              </div>
              <p className="text-lg font-semibold text-foreground">{project.name}</p>
            </div>

            {/* Project Status */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
              </div>
              <Badge className={getStatusColor(project.status)} variant="secondary">
                {project.status}
              </Badge>
            </div>

            {/* Team */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <h4 className="text-sm font-medium text-muted-foreground">Zespół</h4>
              </div>
              <p className="text-lg font-semibold text-foreground">{project.team.name}</p>
              <p className="text-xs text-muted-foreground">
                {project.team.members.length} {project.team.members.length === 1 ? 'członek' : 'członków'}
              </p>
            </div>

            {/* Created Date */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <h4 className="text-sm font-medium text-muted-foreground">Data utworzenia</h4>
              </div>
              <p className="text-sm font-medium text-foreground">
                {new Date(project.createdAt).toLocaleDateString('pl-PL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Last Updated */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <h4 className="text-sm font-medium text-muted-foreground">Ostatnia aktualizacja</h4>
              </div>
              <p className="text-sm font-medium text-foreground">
                {new Date(project.updatedAt).toLocaleDateString('pl-PL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Task Progress */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <h4 className="text-sm font-medium text-muted-foreground">Postęp zadań</h4>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">
                  {stats.completed}/{stats.total}
                </p>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% ukończono
                </p>
              </div>
            </div>
          </div>

          {/* Project Description */}
          {project.description && (
            <div className="mt-6 pt-6 border-t">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <h4 className="text-sm font-medium text-muted-foreground">Opis projektu</h4>
                </div>
                <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-4 rounded-lg">
                  {project.description}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zespół</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.team.name}</div>
            <p className="text-xs text-muted-foreground">
              {project.team.members.length} {project.team.members.length === 1 ? 'członek' : 'członków'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Postęp zadań</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}/{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% ukończono
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zadania zaległe</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Wymaga uwagi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Członkowie zespołu</CardTitle>
          <CardDescription>Osoby pracujące nad tym projektem</CardDescription>
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
          <CardTitle>Podsumowanie zadań</CardTitle>
          <CardDescription>Szczegółowy podział zadań projektu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-sm text-gray-500">Wszystkie zadania</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-sm text-gray-500">Ukończone</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <p className="text-sm text-gray-500">W toku</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-sm text-gray-500">Zaległe</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Dane dostępowe</span>
          </CardTitle>
          <CardDescription>Linki i adresy związane z projektem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.repositoryUrl && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Repozytorium kodu</h4>
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>{project.repositoryUrl}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {project.serverUrl && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Serwer</h4>
              <a
                href={project.serverUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>{project.serverUrl}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {project.apiUrl && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">API</h4>
              <a
                href={project.apiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>{project.apiUrl}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {project.adminPanelUrl && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Panel administracyjny</h4>
              <a
                href={project.adminPanelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>{project.adminPanelUrl}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {project.stagingUrl && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Środowisko testowe</h4>
              <a
                href={project.stagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>{project.stagingUrl}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {project.productionUrl && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Środowisko produkcyjne</h4>
              <a
                href={project.productionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>{project.productionUrl}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {!project.repositoryUrl && !project.serverUrl && !project.apiUrl &&
           !project.adminPanelUrl && !project.stagingUrl && !project.productionUrl && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">Brak skonfigurowanych danych dostępowych</p>
              <p className="text-xs mt-1">Skonfiguruj je w ustawieniach projektu</p>
            </div>
          )}
          <div className="pt-2 border-t">
            <Link href={`/dashboard/projects/${projectId}/settings`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edytuj dane dostępowe
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Project Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Dokumentacja projektu</span>
          </CardTitle>
          <CardDescription>Załączone dokumenty i pliki projektu</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            files={documents?.map(doc => ({
              id: doc.id,
              filename: doc.filename,
              url: doc.url,
              mimeType: doc.mimeType,
              size: doc.size,
              description: doc.description,
              category: doc.category,
              createdAt: doc.createdAt
            })) || []}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
            onFileDownload={handleFileDownload}
            editable={true}
            accept="*/*"
            maxSize={10 * 1024 * 1024} // 10MB
            title="Dokumenty"
            description="Załączone pliki dokumentacji"
            categories={["specification", "design", "manual", "other"]}
            showCategories={true}
            showDescriptions={true}
          />
        </CardContent>
      </Card>
    </div>
    </div>
    </main>
    </div>
  )
}
