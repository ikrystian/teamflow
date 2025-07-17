"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

interface TeamMember {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface PendingImage {
  file: File
  preview: string
  id: string
}

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated: () => void
  projectId: string
  teamMembers: TeamMember[]
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onTaskCreated,
  projectId,
  teamMembers
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [priority, setPriority] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")
  const [statusId, setStatusId] = useState("")
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses`)
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)

        // Set default status if available
        const defaultStatus = data.taskStatuses.find((status: TaskStatus) => status.isDefault)
        if (defaultStatus) {
          setStatusId(defaultStatus.id)
        } else if (data.taskStatuses.length > 0) {
          setStatusId(data.taskStatuses[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }, [projectId])

  useEffect(() => {
    if (open && projectId) {
      fetchTaskStatuses()
    }
  }, [open, projectId, fetchTaskStatuses])

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
          console.error('Failed to upload image:', pendingImage.file.name)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError("Title is required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          projectId,
          assigneeId: assigneeId === "none" ? undefined : assigneeId,
          priority: priority === "none" ? undefined : priority,
          dueDate: dueDate || undefined,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
          statusId: statusId || undefined,
        }),
      })

      if (response.ok) {
        const { task } = await response.json()

        // If there are pending images, upload them
        if (pendingImages.length > 0) {
          await uploadPendingImages(task.id)
        }

        onTaskCreated()
        handleClose()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to create task")
      }
    } catch (error) {
      console.error("Error creating task:", error)
      setError("Failed to create task")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTitle("")
    setDescription("")
    setAssigneeId("none")
    setPriority("none")
    setDueDate("")
    setEstimatedHours("")
    setStatusId("")

    // Clean up pending images
    pendingImages.forEach(img => URL.revokeObjectURL(img.preview))
    setPendingImages([])

    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Utwórz nowe zadanie</DialogTitle>
          <DialogDescription>
            Dodaj nowe zadanie do tego projektu. Wypełnij poniższe szczegóły.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Tytuł *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Wprowadź tytuł zadania"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Wprowadź opis zadania (opcjonalnie)"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignee">Przypisany</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz przypisanego (opcjonalnie)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak przypisanego</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz status" />
                </SelectTrigger>
                <SelectContent>
                  {taskStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span>{status.name}</span>
                        {status.isDefault && (
                          <span className="text-xs text-gray-500">(domyślny)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priorytet</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz priorytet (opcjonalnie)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak priorytetu</SelectItem>
                  <SelectItem value="Low">Niski</SelectItem>
                  <SelectItem value="Medium">Średni</SelectItem>
                  <SelectItem value="High">Wysoki</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Termin wykonania</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimatedHours">Szacowany czas</Label>
              <Select value={estimatedHours} onValueChange={setEstimatedHours}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz szacowany czas" />
                </SelectTrigger>
                <SelectContent>
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

            {/* Images Section */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Obrazki (Opcjonalnie)</Label>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload-create-project"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image-upload-create-project')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Dodaj obrazki
                  </Button>
                </div>
              </div>

              {pendingImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {pendingImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={image.preview}
                          alt={image.file.name}
                          layout="fill"
                          objectFit="cover"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePendingImage(image.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {image.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Tworzenie..." : "Utwórz zadanie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
