"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Settings, GripVertical, Edit, Trash2, Key, Save, Eye, EyeOff, X } from "lucide-react"
import { TaskStatusDialog } from "./task-status-dialog"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
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
  }
}

interface ProjectSettingsContentProps {
  projectId: string
}

function SortableTaskStatus({
  status,
  onEdit,
  onDelete
}: {
  status: TaskStatus
  onEdit: (status: TaskStatus) => void
  onDelete: (status: TaskStatus) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm"
    >
      <div className="flex items-center space-x-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{status.name}</span>
            {status.isDefault && (
              <Badge variant="secondary" className="text-xs">
                Domyślny
              </Badge>
            )}
          </div>
          <span className="text-sm text-gray-500">Kolejność: {status.order}</span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(status)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(status)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function ProjectSettingsContent({ projectId }: ProjectSettingsContentProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null)
  const [credentialsList, setCredentialsList] = useState<Array<{
    id: string
    name: string
    content: string
  }>>([])
  const [newCredential, setNewCredential] = useState({
    name: '',
    content: ''
  })
  const [editingCredential, setEditingCredential] = useState<string | null>(null)
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({})
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchProject = useCallback(async () => {
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
    }
  }, [projectId, router])

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses`)
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
    fetchTaskStatuses()
  }, [projectId, fetchProject, fetchTaskStatuses])

  useEffect(() => {
    if (project) {
      // Parse credentials from JSON if exists
      let parsedCredentials: Array<{id: string, name: string, content: string}> = []
      if (project.credentials) {
        try {
          const parsed = JSON.parse(project.credentials)
          // Handle both old format (single object) and new format (array)
          if (Array.isArray(parsed)) {
            parsedCredentials = parsed
          } else if (parsed.name && parsed.content) {
            // Convert old format to new format
            parsedCredentials = [{
              id: Date.now().toString(),
              name: parsed.name,
              content: parsed.content
            }]
          }
        } catch (error) {
          console.error('Error parsing credentials:', error)
        }
      }
      setCredentialsList(parsedCredentials)
    }
  }, [project])

  const handleAddCredential = () => {
    if (!newCredential.name.trim() || !newCredential.content.trim()) {
      return
    }

    const credential = {
      id: Date.now().toString(),
      name: newCredential.name,
      content: newCredential.content
    }

    setCredentialsList(prev => [...prev, credential])
    setNewCredential({ name: '', content: '' })
    saveCredentialsList([...credentialsList, credential])
  }

  const handleEditCredential = (id: string) => {
    setEditingCredential(id)
  }

  const handleSaveEdit = (id: string, name: string, content: string) => {
    const updatedList = credentialsList.map(cred =>
      cred.id === id ? { ...cred, name, content } : cred
    )
    setCredentialsList(updatedList)
    setEditingCredential(null)
    saveCredentialsList(updatedList)
  }

  const handleDeleteCredential = (id: string) => {
    const updatedList = credentialsList.filter(cred => cred.id !== id)
    setCredentialsList(updatedList)
    saveCredentialsList(updatedList)
  }

  const saveCredentialsList = async (list: typeof credentialsList) => {
    setSavingCredentials(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: JSON.stringify(list)
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        // Show success message or toast
      } else {
        console.error('Failed to update credentials')
      }
    } catch (error) {
      console.error('Error updating credentials:', error)
    } finally {
      setSavingCredentials(false)
    }
  }

  const handleNewCredentialChange = (field: 'name' | 'content', value: string) => {
    setNewCredential(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const toggleShowCredential = (id: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = taskStatuses.findIndex((status) => status.id === active.id)
      const newIndex = taskStatuses.findIndex((status) => status.id === over?.id)

      const newOrder = arrayMove(taskStatuses, oldIndex, newIndex)
      setTaskStatuses(newOrder)

      // Update order on server
      try {
        await fetch(`/api/projects/${projectId}/task-statuses/reorder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            statusIds: newOrder.map(status => status.id)
          }),
        })
      } catch (error) {
        console.error("Error reordering task statuses:", error)
        // Revert on error
        fetchTaskStatuses()
      }
    }
  }

  const handleCreateStatus = () => {
    setEditingStatus(null)
    setStatusDialogOpen(true)
  }

  const handleEditStatus = (status: TaskStatus) => {
    setEditingStatus(status)
    setStatusDialogOpen(true)
  }

  const handleDeleteStatus = async (status: TaskStatus) => {
    if (!confirm(`Czy na pewno chcesz usunąć status "${status.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses/${status.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchTaskStatuses()
      } else {
        const data = await response.json()
        alert(data.error || "Nie udało się usunąć statusu")
      }
    } catch (error) {
      console.error("Error deleting task status:", error)
      alert("Wystąpił błąd podczas usuwania statusu")
    }
  }

  const handleStatusSaved = () => {
    fetchTaskStatuses()
    setStatusDialogOpen(false)
  }

  if (loading) {
    return <div>Ładowanie...</div>
  }

  if (!project) {
    return <div>Projekt nie znaleziony</div>
  }

  return (
            <div>
              {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div id="dynamic-header" className="flex flex-1" >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ustawienia projektu</h1>
            <p className="text-gray-500">{project.name}</p>
          </div>
        </div>
      </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
    <div id="page-header" className="space-y-6">
      {/* Header */}

      {/* Access Credentials Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Dane dostępowe</span>
          </CardTitle>
          <CardDescription>
            Dodaj nazwę i szczegóły danych dostępowych do projektu (hasła, klucze API, linki, itp.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Existing credentials list */}
            {credentialsList.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Zapisane dane dostępowe</h4>
                {credentialsList.map((credential) => (
                  <CredentialItem
                    key={credential.id}
                    credential={credential}
                    isEditing={editingCredential === credential.id}
                    isVisible={showCredentials[credential.id] || false}
                    onEdit={() => handleEditCredential(credential.id)}
                    onSave={(name, content) => handleSaveEdit(credential.id, name, content)}
                    onDelete={() => handleDeleteCredential(credential.id)}
                    onToggleVisibility={() => toggleShowCredential(credential.id)}
                    onCancelEdit={() => setEditingCredential(null)}
                  />
                ))}
              </div>
            )}

            {/* Add new credential form */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-4">Dodaj nowe dane dostępowe</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newCredentialName">Nazwa dostępów</Label>
                  <Input
                    id="newCredentialName"
                    placeholder="np. Dane dostępowe do serwera produkcyjnego"
                    value={newCredential.name}
                    onChange={(e) => handleNewCredentialChange('name', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="newCredentialContent">Dane dostępowe</Label>
                  <RichTextEditor
                    content={newCredential.content}
                    onChange={(content) => handleNewCredentialChange('content', content)}
                    placeholder="Wprowadź dane dostępowe (hasła, klucze API, linki, itp.)"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddCredential}
                    disabled={!newCredential.name.trim() || !newCredential.content.trim() || savingCredentials}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {savingCredentials ? 'Dodawanie...' : 'Dodaj dane dostępowe'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Status Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Statusy zadań</span>
              </CardTitle>
              <CardDescription>
                Skonfiguruj własne statusy zadań dla tego projektu. Przeciągnij, aby zmienić kolejność.
              </CardDescription>
            </div>
            <Button onClick={handleCreateStatus}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={taskStatuses.map(status => status.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {taskStatuses.map((status) => (
                  <SortableTaskStatus
                    key={status.id}
                    status={status}
                    onEdit={handleEditStatus}
                    onDelete={handleDeleteStatus}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {taskStatuses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Settings className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>Ładowanie statusów zadań...</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onStatusSaved={handleStatusSaved}
        projectId={projectId}
        status={editingStatus}
      />
    </div>
    </div>
    </main>
    </div>
  )
}

// Credential Item Component
interface CredentialItemProps {
  credential: {
    id: string
    name: string
    content: string
  }
  isEditing: boolean
  isVisible: boolean
  onEdit: () => void
  onSave: (name: string, content: string) => void
  onDelete: () => void
  onToggleVisibility: () => void
  onCancelEdit: () => void
}

function CredentialItem({
  credential,
  isEditing,
  isVisible,
  onEdit,
  onSave,
  onDelete,
  onToggleVisibility,
  onCancelEdit
}: CredentialItemProps) {
  const [editName, setEditName] = useState(credential.name)
  const [editContent, setEditContent] = useState(credential.content)

  const handleSave = () => {
    if (editName.trim() && editContent.trim()) {
      onSave(editName, editContent)
    }
  }

  const handleCancel = () => {
    setEditName(credential.name)
    setEditContent(credential.content)
    onCancelEdit()
  }

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 bg-background">
        <div className="space-y-4">
          <div>
            <Label>Nazwa dostępów</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nazwa dostępów"
            />
          </div>

          <div>
            <Label>Dane dostępowe</Label>
            <RichTextEditor
              content={editContent}
              onChange={setEditContent}
              placeholder="Wprowadź dane dostępowe"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Anuluj
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editName.trim() || !editContent.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              Zapisz
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-background">
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-medium">{credential.name}</h5>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onToggleVisibility}>
            {isVisible ? (
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
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edytuj
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń
          </Button>
        </div>
      </div>

      {isVisible ? (
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
  )
}
