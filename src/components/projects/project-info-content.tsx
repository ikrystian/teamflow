"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { usePageHeader } from "@/contexts/header-context"
import { PageHeader, PageBody } from "@/components/dashboard/page-header"
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info,
  FileText,
  Edit,
  Eye,
  ListChecks,
  Clock
} from "lucide-react"
import Link from "next/link"
import { FileUpload } from "@/components/ui/file-upload"
import { ProjectAccessCard } from "./project-access-card"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { SafeHtml } from "@/components/ui/safe-html"

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
  client?: { id: string; name: string } | null

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

const CRM_CLIENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ProjectInfoContentProps {
  projectId: string
}

export function ProjectInfoContent({ projectId }: ProjectInfoContentProps) {
  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<ProjectDetails['documents']>([])
  const [isEditingReadme, setIsEditingReadme] = useState(false)
  const [readmeContent, setReadmeContent] = useState("")
  const [readmeLoading, setReadmeLoading] = useState(false)
  const router = useRouter()

  // Set page header content
  usePageHeader(
    project ? (
      <PageHeader
        backHref={`/dashboard/projects/${projectId}`}
        title={project.name}
        description="Informacje, dane dostępowe i dokumenty projektu"
        meta={<Badge variant="outline" className="text-[11px]">{project.status}</Badge>}
      />
    ) : (
      <PageHeader title="Ładowanie informacji o projekcie..." />
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
        <h3 className="text-lg font-medium text-foreground mb-2">Projekt nie znaleziony</h3>
        <p className="text-muted-foreground mb-4">Projekt, którego szukasz, nie istnieje lub nie masz do niego dostępu.</p>
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
  // Klient z modułu CRM (UUID); identyfikator sprzed importu wskazuje jeszcze starą kolekcję klientów.
  const crmClient = project.client && CRM_CLIENT_ID.test(project.client.id) ? project.client : null

  return (
    <PageBody className="max-w-6xl">
    <div className="space-y-6" id="info">
      {/* Task Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Wszystkie zadania", value: stats.total, icon: ListChecks, tone: "text-muted-foreground bg-muted" },
          { label: "Ukończone", value: stats.completed, icon: CheckCircle, tone: "text-success bg-success/10" },
          { label: "W toku", value: stats.inProgress, icon: Clock, tone: "text-primary bg-primary/10" },
          { label: "Zaległe", value: stats.overdue, icon: AlertCircle, tone: stats.overdue > 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="gap-0 py-4">
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
                <span className={`flex size-7 items-center justify-center rounded-md ${tone}`}>
                  <Icon className="size-3.5" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Info className="size-4 text-muted-foreground" />
            Przegląd projektu
          </CardTitle>
          <CardDescription>Podstawowe informacje o tym projekcie</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Nazwa projektu</dt>
              <dd className="flex items-center gap-2 text-sm font-medium">
                <span className="size-2 rounded-full" style={{ backgroundColor: project.color || "var(--primary)" }} />
                {project.name}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Status</dt>
              <dd><Badge variant="secondary">{project.status}</Badge></dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Klient</dt>
              <dd className="text-sm font-medium">
                {crmClient ? (
                  <Link href={`/dashboard/clients/${crmClient.id}`} className="underline-offset-4 hover:underline">
                    {crmClient.name}
                  </Link>
                ) : project.client ? (
                  <span title="Klient zostanie przeniesiony do modułu klientów przy konfiguracji sejfu organizacji">{project.client.name}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Data utworzenia</dt>
              <dd className="text-sm font-medium">
                {new Date(project.createdAt).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Ostatnia aktualizacja</dt>
              <dd className="text-sm font-medium">
                {new Date(project.updatedAt).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}
              </dd>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <dt className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Postęp zadań</span>
                <span className="tabular-nums text-foreground">{stats.completed}/{stats.total} · {(stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0)}%</span>
              </dt>
              <dd className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-success transition-all duration-300"
                  style={{ width: `${(stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0)}%` }}
                />
              </dd>
            </div>
          </dl>

          {/* Project Description */}
          {project.description && (
            <div className="mt-5 border-t pt-5">
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">Opis projektu</h4>
              <p className="rounded-lg bg-muted/40 p-3.5 text-sm leading-relaxed text-foreground">
                {project.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Credentials — z sejfu klienta (E2E) */}
      <ProjectAccessCard
        projectId={projectId}
        projectName={project.name}
        client={crmClient}
        legacyRaw={project.credentials}
        onLegacyCleared={() => setProject((prev) => (prev ? { ...prev, credentials: undefined } : prev))}
      />

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
                <SafeHtml className="prose prose-sm max-w-none" html={project.readme} />
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
          <CardTitle>
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
    </PageBody>
  )
}
