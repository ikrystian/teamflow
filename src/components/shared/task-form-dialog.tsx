"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { ImageGallery } from "@/components/ui/image-gallery"
import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, X } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { dateToLocalDateString } from "@/lib/date-utils"
import type { Task, User, TaskStatus, TaskImage } from "@/types"

interface Project {
  id: string
  name: string
  team: {
    id: string
    name: string
  }
}

interface PendingImage {
  file: File
  preview: string
  id: string
}

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated?: () => void
  onTaskUpdated?: () => void

  // For create mode
  projects?: Project[]
  projectId?: string
  teamMembers?: User[]
  defaultStatusId?: string
  forceAssignToCurrentUser?: boolean // When true, always assign to current user regardless of project

  // For edit mode
  task?: Task | null

  // Mode determination
  mode: "create" | "edit"
}

export function TaskFormDialog({
  open,
  onOpenChange,
  onTaskCreated,
  onTaskUpdated,
  projects = [],
  projectId,
  teamMembers = [],
  defaultStatusId,
  forceAssignToCurrentUser = false,
  task,
  mode
}: TaskFormDialogProps) {
  const { data: session } = useSession() as { data: Session | null }

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [statusId, setStatusId] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [priority, setPriority] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")

  // Additional state
  const [, setTaskStatuses] = useState<TaskStatus[]>([])
  const [images, setImages] = useState<TaskImage[]>([])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"

  // Determine if we should show project selector
  const showProjectSelector = ((isCreateMode && !projectId) || isEditMode) && projects.length > 0

  // Get current project for team member selection
  const currentProject = projectId
    ? { id: projectId, team: { members: teamMembers } }
    : projects.find(p => p.id === selectedProjectId)

  // Get team members for the current context
  const availableTeamMembers = projectId
    ? teamMembers
    : ('members' in (currentProject?.team || {}))
      ? (currentProject?.team as { members: User[] }).members
      : teamMembers

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)

        // Set default status for create mode
        if (isCreateMode) {
          if (defaultStatusId) {
            setStatusId(defaultStatusId)
          } else {
            const defaultStatus = data.taskStatuses.find((status: TaskStatus) => status.isDefault)
            if (defaultStatus) {
              setStatusId(defaultStatus.id)
            } else if (data.taskStatuses.length > 0) {
              setStatusId(data.taskStatuses[0].id)
            }
          }
        }

        // Set status for edit mode
        if (isEditMode && task) {
          if (task.statusId) {
            setStatusId(task.statusId)
          } else {
            const defaultStatus = data.taskStatuses.find((s: TaskStatus) => s.isDefault)
            if (defaultStatus) {
              setStatusId(defaultStatus.id)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }, [isCreateMode, isEditMode, task, defaultStatusId])

  // Initialize form when dialog opens or task changes
  useEffect(() => {
    if (open) {
      fetchTaskStatuses()

      if (isCreateMode) {
        // Reset form for create mode
        setTitle("")
        setDescription("")
        setSelectedProjectId(projectId || "")
        setAssigneeId(session?.user?.id || "")
        setPriority("")
        setDueDate("")
        setEstimatedHours("")
        setImages([])
        setPendingImages([])
        setError("")
      } else if (isEditMode && task) {
        // Populate form for edit mode
        setTitle(task.title)
        setDescription(task.description || "")
        setSelectedProjectId(task.project?.id || "")
        setAssigneeId(task.assignee?.id || "unassigned")
        setPriority(task.priority || "")
        setDueDate(task.dueDate ? task.dueDate.split('T')[0] : "")
        setEstimatedHours(task.estimatedHours ? task.estimatedHours.toString() : "none")
        setImages(task.images || [])
        setPendingImages([])
        setError("")
      }
    }
  }, [open, isCreateMode, isEditMode, task, projectId, session?.user?.id, fetchTaskStatuses])

  // Force assign to current user when forceAssignToCurrentUser is true
  useEffect(() => {
    if (forceAssignToCurrentUser && isCreateMode && session?.user?.id) {
      setAssigneeId(session.user.id)
    }
  }, [forceAssignToCurrentUser, isCreateMode, session?.user?.id, selectedProjectId])

  const uploadPendingImages = async (taskId: string) => {
    for (const pendingImage of pendingImages) {
      const formData = new FormData()
      formData.append('file', pendingImage.file)

      try {
        const response = await fetch(`/api/tasks/${taskId}/images`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('Failed to upload image:', pendingImage.file.name, 'Status:', response.status, 'Error:', errorData)
        }
      } catch (error) {
        console.error('Error uploading image:', error)
      }
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    files.forEach(file => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Wszystkie pliki muszą być obrazkami")
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Rozmiar pliku nie może przekraczać 5MB")
        return
      }

      // Create preview URL
      const preview = URL.createObjectURL(file)
      const id = Math.random().toString(36).substring(2, 11)

      setPendingImages(prev => [...prev, { file, preview, id }])
    })

    // Reset input
    e.target.value = ""
  }

  const removePendingImage = (id: string) => {
    setPendingImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  const handleImageUpload = async (file: File): Promise<void> => {
    if (!task) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`/api/tasks/${task.id}/images`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const newImage = await response.json()
        setImages(prev => [...prev, newImage])
      } else {
        throw new Error('Nie udało się przesłać obrazu')
      }
    } catch (error) {
      console.error('Błąd podczas przesyłania obrazu:', error)
      setError('Nie udało się przesłać obrazu')
    }
  }

  const handleImageDelete = async (imageId: string): Promise<void> => {
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${task.id}/images?imageId=${imageId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== imageId))
      } else {
        throw new Error('Nie udało się usunąć obrazu')
      }
    } catch (error) {
      console.error('Błąd podczas usuwania obrazu:', error)
      setError('Nie udało się usunąć obrazu')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isCreateMode) {
        // Create new task
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            projectId: (projectId || selectedProjectId) && (projectId || selectedProjectId) !== "no-project"
              ? (projectId || selectedProjectId)
              : undefined,
            assigneeId: assigneeId && assigneeId !== "unassigned" ? assigneeId : undefined,
            priority: priority || undefined,
            dueDate: dueDate || undefined,
            estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
            statusId: statusId || undefined
          }),
        })

        if (response.ok) {
          const { task: newTask } = await response.json()

          // Upload pending images
          if (pendingImages.length > 0) {
            await uploadPendingImages(newTask.id)
          }

          onTaskCreated?.()
          handleClose()
        } else {
          const data = await response.json()
          setError(data.error || "Nie udało się utworzyć zadania")
        }
      } else if (isEditMode && task) {
        // Update existing task
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            statusId: statusId || undefined,
            assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
            priority: priority || undefined,
            dueDate: dueDate || undefined,
            estimatedHours: estimatedHours === "none" ? undefined : parseFloat(estimatedHours),
            projectId: selectedProjectId && selectedProjectId !== "no-project" ? selectedProjectId : undefined,
          }),
        })

        if (response.ok) {
          // Upload pending images if any
          if (pendingImages.length > 0) {
            await uploadPendingImages(task.id)
          }

          onTaskUpdated?.()
          handleClose()
        } else {
          const data = await response.json()
          setError(data.error || "Nie udało się zaktualizować zadania")
        }
      }
    } catch {
      setError(isCreateMode ? "Failed to create task" : "Wystąpił błąd. Spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Clean up pending images
    pendingImages.forEach(img => URL.revokeObjectURL(img.preview))
    setPendingImages([])
    setError("")
    onOpenChange(false)
  }

  // Check if there are changes in edit mode
  const hasChanges = isEditMode && task ? (
    title.trim() !== task.title ||
    (description.trim() || undefined) !== task.description ||
    statusId !== task.statusId ||
    (assigneeId === "unassigned" ? undefined : assigneeId) !== task.assignee?.id ||
    (priority || undefined) !== task.priority ||
    (dueDate || undefined) !== (task.dueDate ? task.dueDate.split('T')[0] : undefined) ||
    (estimatedHours === "none" ? undefined : parseFloat(estimatedHours)) !== task.estimatedHours ||
    pendingImages.length > 0
  ) : true

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold">
            {isCreateMode ? "Utwórz nowe zadanie" : "Edytuj zadanie"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isCreateMode
              ? "Utwórz nowe zadanie i przypisz je członkowi zespołu. Wypełnij wymagane pola i dodaj szczegóły."
              : `Zaktualizuj szczegóły zadania. ${task ? `Możesz edytować to zadanie, ponieważ ${task.createdBy?.id === task.assignee?.id ? "utworzyłeś i jesteś do niego przypisany" : task.assignee ? "jesteś do niego przypisany" : "utworzyłeś je"}.` : "Ładowanie szczegółów zadania..."}`
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Tytuł zadania <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Wprowadź tytuł zadania"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Opis</Label>
              <div className="border rounded-md">
                <RichTextEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Wprowadź szczegółowy opis zadania..."
                />
              </div>
            </div>

            {/* Project selector */}
            {showProjectSelector && (
              <div className="space-y-2">
                <Label htmlFor="project" className="text-sm font-medium">
                  Projekt
                </Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Wybierz projekt (opcjonalne)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-project">
                      <span className="text-muted-foreground">Brak projektu</span>
                    </SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{project.name}</span>
                          <span className="text-xs text-muted-foreground">{project.team.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Assignee selector */}
              <div className="space-y-2">
                <Label htmlFor="assignee" className="text-sm font-medium">
                  {(isCreateMode && !projectId && !currentProject) || forceAssignToCurrentUser
                    ? "Przypisany (automatycznie przypisane do Ciebie)"
                    : "Przypisany"
                  }
                </Label>
                {(isCreateMode && !projectId && !currentProject) || forceAssignToCurrentUser ? (
                  <div className="h-10 px-3 py-2 border border-input bg-muted/50 rounded-md flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {session?.user?.name || "Aktualny użytkownik"}
                    </span>
                  </div>
                ) : (
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Wybierz przypisanego" />
                    </SelectTrigger>
                    <SelectContent>
                      {isEditMode && (
                        <SelectItem value="unassigned">Nieprzypisany</SelectItem>
                      )}
                      {availableTeamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {member.name?.charAt(0).toUpperCase() || member.email?.charAt(0).toUpperCase()}
                            </div>
                            <span>{member.name || member.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-medium">Priorytet</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Wybierz priorytet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Niski</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Medium">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span>Średni</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="High">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>Wysoki</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-sm font-medium">Termin wykonania</Label>
                <DatePicker
                  value={dueDate ? new Date(dueDate) : undefined}
                  onChange={(date) => setDueDate(date ? dateToLocalDateString(date) : '')}
                  className="rounded-lg border shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedHours" className="text-sm font-medium">Szacowany czas</Label>
                <Select value={estimatedHours} onValueChange={setEstimatedHours}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Wybierz szacowany czas" />
                  </SelectTrigger>
                  <SelectContent>
                    {isEditMode && <SelectItem value="none">Brak szacunku</SelectItem>}
                    <SelectItem value="0.5">30 minut</SelectItem>
                    <SelectItem value="1">1 godzina</SelectItem>
                    <SelectItem value="1.5">1.5 godziny</SelectItem>
                    <SelectItem value="2">2 godziny</SelectItem>
                    <SelectItem value="2.5">2.5 godziny</SelectItem>
                    <SelectItem value="3">3 godziny</SelectItem>
                    <SelectItem value="3.5">3.5 godziny</SelectItem>
                    <SelectItem value="4">4 godziny</SelectItem>
                    <SelectItem value="4.5">4.5 godziny</SelectItem>
                    <SelectItem value="5">5 godzin</SelectItem>
                    <SelectItem value="5.5">5.5 godziny</SelectItem>
                    <SelectItem value="6">6 godzin</SelectItem>
                    <SelectItem value="6.5">6.5 godziny</SelectItem>
                    <SelectItem value="7">7 godzin</SelectItem>
                    <SelectItem value="7.5">7.5 godziny</SelectItem>
                    <SelectItem value="8">8 godzin</SelectItem>
                    <SelectItem value="12">12 godzin</SelectItem>
                    <SelectItem value="16">16 godzin</SelectItem>
                    <SelectItem value="24">24 godziny</SelectItem>
                    <SelectItem value="40">40 godzin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Images Section */}
            {isCreateMode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Załączniki</Label>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload-task-form"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('image-upload-task-form')?.click()}
                      className="h-9"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Dodaj obrazki
                    </Button>
                  </div>
                </div>

                {pendingImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg border border-dashed">
                    {pendingImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <div className="relative aspect-square overflow-hidden rounded-lg border bg-background shadow-sm">
                          <Image
                            src={image.preview}
                            alt={image.file.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            fill
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          onClick={() => removePendingImage(image.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="mt-2 text-xs text-muted-foreground truncate px-1">
                          {image.file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ImageGallery
                images={images}
                onImageUpload={handleImageUpload}
                onImageDelete={handleImageDelete}
                editable={true}
              />
            )}

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-6">
            <Button type="button" variant="outline" onClick={handleClose} className="h-10">
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim() || (isEditMode && !hasChanges)}
              className="h-10"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {isCreateMode ? "Tworzenie..." : "Aktualizowanie..."}
                </>
              ) : (
                isCreateMode ? "Utwórz zadanie" : "Zaktualizuj zadanie"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
