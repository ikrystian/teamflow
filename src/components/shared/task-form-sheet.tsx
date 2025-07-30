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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Upload, X } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import type { Task, User, TaskStatus, TaskImage } from "@/types"

// Extended User type with teams information
interface UserWithTeams extends User {
  teams?: {
    id: string
    name: string
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

interface PendingImage {
  file: File
  preview: string
  id: string
}

interface TaskFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated?: () => void
  onTaskUpdated?: () => void

  // For create mode
  projects?: Project[]
  projectId?: string
  teamMembers?: UserWithTeams[]
  defaultStatusId?: string
  forceAssignToCurrentUser?: boolean // When true, always assign to current user regardless of project

  // For edit mode
  task?: Task | null

  // Mode determination
  mode: "create" | "edit"
}

export function TaskFormSheet({
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
}: TaskFormSheetProps) {
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
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [images, setImages] = useState<TaskImage[]>([])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"

  // Fetch task statuses
  useEffect(() => {
    const fetchTaskStatuses = async () => {
      try {
        const response = await fetch('/api/system/task-statuses')
        if (response.ok) {
          const data = await response.json()
          setTaskStatuses(data.taskStatuses)
        }
      } catch (error) {
        console.error("Error fetching task statuses:", error)
      }
    }

    if (open) {
      fetchTaskStatuses()
    }
  }, [open])

  // Initialize form for create mode
  useEffect(() => {
    if (isCreateMode && open) {
      setTitle("")
      setDescription("")
      setSelectedProjectId(projectId || "")
      setStatusId(defaultStatusId || "")
      setAssigneeId(forceAssignToCurrentUser && session?.user?.id ? session.user.id : "")
      setPriority("")
      setDueDate("")
      setEstimatedHours("")
      setImages([])
      setPendingImages([])
      setError("")
    }
  }, [isCreateMode, open, projectId, defaultStatusId, forceAssignToCurrentUser, session?.user?.id])

  // Initialize form for edit mode
  useEffect(() => {
    if (isEditMode && task && open) {
      setTitle(task.title || "")
      setDescription(task.description || "")
      setSelectedProjectId(task.project?.id || "")
      setStatusId(task.statusId || "")
      setAssigneeId(task.assignee?.id || "")
      setPriority(task.priority || "")
      setDueDate(task.dueDate || "")
      setEstimatedHours(task.estimatedHours?.toString() || "")
      setImages(task.images || [])
      setPendingImages([])
      setError("")
    }
  }, [isEditMode, task, open])

  const handleClose = useCallback(() => {
    setTitle("")
    setDescription("")
    setSelectedProjectId("")
    setStatusId("")
    setAssigneeId("")
    setPriority("")
    setDueDate("")
    setEstimatedHours("")
    setImages([])
    setPendingImages([])
    setError("")
    onOpenChange(false)
  }, [onOpenChange])

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          const newImage: PendingImage = {
            file,
            preview,
            id: Math.random().toString(36).substr(2, 9)
          }
          setPendingImages(prev => [...prev, newImage])
        }
        reader.readAsDataURL(file)
      }
    })

    // Reset input
    event.target.value = ''
  }, [])

  const handleRemovePendingImage = useCallback((imageId: string) => {
    setPendingImages(prev => prev.filter(img => img.id !== imageId))
  }, [])

  const handleRemoveExistingImage = useCallback(async (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId))
  }, [])

  const uploadImages = async (taskId: string): Promise<void> => {
    if (pendingImages.length === 0) return

    const formData = new FormData()
    pendingImages.forEach(img => {
      formData.append('images', img.file)
    })

    const response = await fetch(`/api/tasks/${taskId}/images`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload images')
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
          const data = await response.json()

          // Upload images if any
          if (pendingImages.length > 0) {
            await uploadImages(data.task.id)
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
          }),
        })

        if (response.ok) {
          // Upload new images if any
          if (pendingImages.length > 0) {
            await uploadImages(task.id)
          }

          onTaskUpdated?.()
          handleClose()
        } else {
          const data = await response.json()
          setError(data.error || "Nie udało się zaktualizować zadania")
        }
      }
    } catch {
      setError("Wystąpił błąd. Spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  // Get available team members for the selected project
  const getAvailableTeamMembers = () => {
    if (isCreateMode && !forceAssignToCurrentUser) {
      const selectedProject = projects.find(p => p.id === (projectId || selectedProjectId))
      if (selectedProject) {
        return teamMembers.filter(member =>
          member.teams?.some(team => team.id === selectedProject.team.id)
        )
      }
    }
    return teamMembers
  }

  const availableTeamMembers = getAvailableTeamMembers()

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-left">
            {isCreateMode ? "Nowe zadanie" : "Edytuj zadanie"}
          </SheetTitle>
          <SheetDescription className="text-left">
            {isCreateMode
              ? "Wypełnij formularz, aby utworzyć nowe zadanie."
              : "Zaktualizuj informacje o zadaniu."
            }
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 py-4 px-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł zadania *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Wprowadź tytuł zadania"
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Opisz zadanie..."
            />
          </div>

          {/* Project Selection (only in create mode and when not forced to specific project) */}
          {isCreateMode && !projectId && projects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="project">Projekt</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-project">Brak projektu</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.team.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status */}
          {taskStatuses.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusId}
                onValueChange={setStatusId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz status" />
                </SelectTrigger>
                <SelectContent>
                  {taskStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assignee */}
          {!forceAssignToCurrentUser && availableTeamMembers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="assignee">Przypisz do</Label>
              <Select
                value={assigneeId}
                onValueChange={setAssigneeId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz osobę" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Nieprzypisany</SelectItem>
                  {availableTeamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priorytet</Label>
            <Select
              value={priority}
              onValueChange={setPriority}
              disabled={loading}
            >
              <SelectTrigger>
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

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Termin wykonania</Label>
            <DatePicker
              value={dueDate ? new Date(dueDate) : undefined}
              onChange={(date) => setDueDate(date ? date.toISOString().split('T')[0] : "")}
              className="rounded-md border shadow-sm"
              locale="pl"
            />
          </div>

          {/* Estimated Hours */}
          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Szacowany czas (godziny)</Label>
            <Input
              id="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="np. 8"
              disabled={loading}
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Załączniki</Label>

            {/* Existing images (edit mode) */}
            {isEditMode && images.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Obecne załączniki:</p>
                <ImageGallery
                  images={images}
                  editable={true}
                  onImageDelete={handleRemoveExistingImage}
                />
              </div>
            )}

            {/* Pending images */}
            {pendingImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Nowe załączniki:</p>
                <div className="grid grid-cols-2 gap-4">
                  {pendingImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <Image
                        src={img.preview}
                        alt="Preview"
                        width={200}
                        height={150}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePendingImage(img.id)}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={loading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Dodaj załączniki
              </Button>
              <input
                id="image-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </form>

        <SheetFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={loading || !title.trim()}
            onClick={handleSubmit}
          >
            {loading ? "Zapisywanie..." : (isCreateMode ? "Utwórz zadanie" : "Zaktualizuj zadanie")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
