"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
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

interface Project {
  id: string
  name: string
  team: {
    id: string
    name: string
  }
}

interface TeamMember {
  id: string
  name: string
  email: string
  avatarUrl?: string
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
  projects: Project[]
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onTaskCreated,
  projects
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [projectId, setProjectId] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [priority, setPriority] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedProject = projects.find(p => p.id === projectId)

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`)
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.members || [])
      }
    } catch (error) {
      console.error("Błąd podczas pobierania członków zespołu:", error)
      setTeamMembers([])
    }
  }

  useEffect(() => {
    if (selectedProject) {
      fetchTeamMembers(selectedProject.team.id)
    } else {
      setTeamMembers([])
    }
    setAssigneeId("")
  }, [selectedProject])

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
    setLoading(true)
    setError("")

    try {
      // First, create the task
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          projectId,
          assigneeId: assigneeId || undefined,
          priority: priority || undefined,
          dueDate: dueDate || undefined,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined
        }),
      })

      if (response.ok) {
        const { task } = await response.json()

        // If there are pending images, upload them
        if (pendingImages.length > 0) {
          await uploadPendingImages(task.id)
        }

        resetForm()
        onTaskCreated()
      } else {
        const data = await response.json()
        setError(data.error || "Nie udało się utworzyć zadania")
      }
    } catch {
      setError("Failed to create task")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setProjectId("")
    setAssigneeId("")
    setPriority("")
    setDueDate("")
    setEstimatedHours("")
    setTeamMembers([])

    // Clean up pending images
    pendingImages.forEach(img => URL.revokeObjectURL(img.preview))
    setPendingImages([])

    setError("")
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Utwórz nowe zadanie</DialogTitle>
          <DialogDescription>
            Utwórz nowe zadanie i przypisz je członkowi zespołu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Tytuł zadania</Label>
              <Input
                id="title"
                placeholder="Wprowadź tytuł zadania"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Opis (Opcjonalnie)</Label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Wprowadź opis zadania"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project">Projekt</Label>
              <Select value={projectId} onValueChange={setProjectId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz projekt" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.team.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assignee">Przypisany (Opcjonalnie)</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz przypisanego" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priorytet (Opcjonalnie)</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz priorytet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Niski</SelectItem>
                    <SelectItem value="Medium">Średni</SelectItem>
                    <SelectItem value="High">Wysoki</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Termin wykonania (Opcjonalnie)</Label>
              <DatePicker
                value={dueDate ? new Date(dueDate) : undefined}
                onChange={(date) => setDueDate(date ? date.toISOString().split('T')[0] : '')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimatedHours">Szacowany czas (Opcjonalnie)</Label>
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
                    id="image-upload-create"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image-upload-create')?.click()}
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
                          className="w-full h-full object-cover"
                          fill
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
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || !title.trim() || !projectId}>
              {loading ? "Tworzenie..." : "Utwórz zadanie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
