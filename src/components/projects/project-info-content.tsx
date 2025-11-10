"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { usePageHeader } from "@/contexts/header-context"
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info,
  Key,
  FileText,
  Edit,
  Eye,
  EyeOff
} from "lucide-react"
import Link from "next/link"
import { FileUpload } from "@/components/ui/file-upload"
import { RichTextEditor } from "@/components/ui/rich-text-editor"

interface ProjectDetails {
  id: string
  name: string
  description?: string
  readme?: string
  status: string
  color?: string
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

  tasks?: {
    id: string
    title: string
    description?: string
    statusId?: string
    taskStatus?: {
      id: string
      name: string
      color: string
    }
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
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({})
  const [isEditingReadme, setIsEditingReadme] = useState(false)
  const [readmeContent, setReadmeContent] = useState("")
  const [readmeLoading, setReadmeLoading] = useState(false)
  const router = useRouter()

  // Set page header content
  usePageHeader(
    project ? (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Informacje o {project.name}</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge>
            {project.status}
          </Badge>
        </div>
      </div>
    ) : (
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ładowanie informacji o projekcie...</h1>
      </div>
    ),
    [project, projectId] // Re-render when project or projectId changes
  )

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (response.ok) {
          const data = await response.json()
          setProject(data.project)
          setReadmeContent(data.project.readme || "")
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to upload document:', response.status, errorData)
        alert(`Failed to upload document: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      alert(`Error uploading document: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  const handleReadmeEdit = () => {
    setReadmeContent(project?.readme || "")
    setIsEditingReadme(true)
  }

  const handleReadmeSave = async () => {
    if (!project) return

    setReadmeLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          readme: readmeContent
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        setIsEditingReadme(false)
      } else {
        console.error('Failed to update README')
        alert('Nie udało się zaktualizować README')
      }
    } catch (error) {
      console.error('Error updating README:', error)
      alert('Wystąpił błąd podczas aktualizacji README')
    } finally {
      setReadmeLoading(false)
    }
  }

  const handleReadmeCancel = () => {
    setReadmeContent(project?.readme || "")
    setIsEditingReadme(false)
  }

  const getTaskStats = (tasks: ProjectDetails['tasks']) => {
    // Handle case where tasks is undefined or null
    if (!tasks || !Array.isArray(tasks)) {
      return { total: 0, completed: 0, inProgress: 0, overdue: 0 }
    }

    const total = tasks.length
    const completed = tasks.filter(task => task.taskStatus?.name?.toLowerCase() === "done").length
    const inProgress = tasks.filter(task => task.taskStatus?.name?.toLowerCase() === "in progress").length
    const overdue = tasks.filter(task =>
      task.dueDate && new Date(task.dueDate) < new Date() && task.taskStatus?.name?.toLowerCase() !== "done"
    ).length

    return { total, completed, inProgress, overdue }
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
    <div className="space-y-6 p-4 md:p-8 pt-6">
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
              <Badge variant="secondary">
                {project.status}
              </Badge>
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
          <CardDescription>Dane dostępowe do projektu (hasła, klucze API, linki, itp.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            // Parse credentials from JSON if exists
            let parsedCredentials: Array<{id: string, name: string, content: string}> = []
            if (project.credentials) {
              try {
                const parsed = JSON.parse(project.credentials)
                // Handle both old format (single object) and new format (array)
                if (Array.isArray(parsed)) {
                  parsedCredentials = parsed
                } else if (parsed.name && parsed.content) {
                  // Convert old format to new format for display
                  parsedCredentials = [{
                    id: 'legacy',
                    name: parsed.name,
                    content: parsed.content
                  }]
                }
              } catch (error) {
                console.error('Error parsing credentials:', error)
              }
            }

            if (parsedCredentials.length > 0) {
              return (
                <div className="space-y-4">
                  {parsedCredentials.map((credential) => (
                    <div key={credential.id} className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-foreground">
                          {credential.name}
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCredentials(prev => ({
                            ...prev,
                            [credential.id]: !prev[credential.id]
                          }))}
                        >
                          {showCredentials[credential.id] ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Ukryj
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Pokaż
                            </>
                          )}
                        </Button>
                      </div>

                      {showCredentials[credential.id] ? (
                        <div
                          className="prose prose-sm max-w-none text-foreground"
                          dangerouslySetInnerHTML={{ __html: credential.content }}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          Dane dostępowe są ukryte. Kliknij &quot;Pokaż&quot; aby je wyświetlić.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            } else {
              return (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Brak skonfigurowanych danych dostępowych</p>
                  <p className="text-xs mt-1">Skonfiguruj je w ustawieniach projektu</p>
                </div>
              )
            }
          })()}

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

      {/* Project README */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>README projektu</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={isEditingReadme ? handleReadmeCancel : handleReadmeEdit}
              disabled={readmeLoading}
            >
              {isEditingReadme ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Anuluj
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edytuj
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Opis projektu w formacie README z możliwością formatowania
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingReadme ? (
            <div className="space-y-4">
              <RichTextEditor
                content={readmeContent}
                onChange={setReadmeContent}
                placeholder="Wprowadź opis projektu w formacie README..."
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleReadmeCancel}
                  disabled={readmeLoading}
                >
                  Anuluj
                </Button>
                <Button
                  onClick={handleReadmeSave}
                  disabled={readmeLoading}
                >
                  {readmeLoading ? "Zapisywanie..." : "Zapisz"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="min-h-[120px]">
              {project.readme ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: project.readme }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Brak README dla tego projektu</p>
                  <p className="text-xs">Kliknij &quot;Edytuj&quot; aby dodać opis projektu</p>
                </div>
              )}
            </div>
          )}
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
  )
}
