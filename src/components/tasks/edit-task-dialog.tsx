"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { ImageGallery } from "@/components/ui/image-gallery"
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
import { DatePicker } from "@/components/ui/date-picker"
import type { Task, User, TaskStatus, TaskImage } from "@/types"

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated: () => void
  task: Task | null
  teamMembers: User[]
}

export function EditTaskDialog({
  open,
  onOpenChange,
  onTaskUpdated,
  task,
  teamMembers
}: EditTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [statusId, setStatusId] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [priority, setPriority] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [images, setImages] = useState<TaskImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)

        // After loading task statuses, ensure the current task's status is properly set
        if (task && data.taskStatuses.length > 0) {
          if (task.statusId) {
            // If task has a statusId, use it
            setStatusId(task.statusId)
          } else {
            // If no status set, use the default status
            const defaultStatus = data.taskStatuses.find((s: TaskStatus) => s.isDefault)
            if (defaultStatus) {
              setStatusId(defaultStatus.id)
            }
          }
        }
      }
    } catch (error) {
      console.error("Błąd podczas pobierania statusów zadań:", error)
    }
  }, [task])

  // Update form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
      setImages(task.images || [])
      // Don't set status values here - they will be set properly after task statuses are loaded
      setAssigneeId(task.assignee?.id || "unassigned")
      setPriority(task.priority || "")
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : "")
      setEstimatedHours(task.estimatedHours ? task.estimatedHours.toString() : "none")
      fetchTaskStatuses()
    } else {
      resetForm()
    }
    setError("")
  }, [task, fetchTaskStatuses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setLoading(true)
    setError("")

    try {
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
        onTaskUpdated()
        handleClose()
      } else {
        const data = await response.json()
        setError(data.error || "Nie udało się zaktualizować zadania")
      }
    } catch {
      setError("Wystąpił błąd. Spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setImages([])
    setStatusId("")
    setAssigneeId("unassigned")
    setPriority("")
    setDueDate("")
    setEstimatedHours("none")
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

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const hasChanges = task ? (
    title.trim() !== task.title ||
    (description.trim() || undefined) !== task.description ||
    statusId !== task.statusId ||
    (assigneeId === "unassigned" ? undefined : assigneeId) !== task.assignee?.id ||
    (priority || undefined) !== task.priority ||
    (dueDate || undefined) !== (task.dueDate ? task.dueDate.split('T')[0] : undefined) ||
    (estimatedHours === "none" ? undefined : parseFloat(estimatedHours)) !== task.estimatedHours
  ) : false

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[625px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj zadanie</DialogTitle>
          <DialogDescription>
            Zaktualizuj szczegóły zadania. {task ? `Możesz edytować to zadanie, ponieważ ${task.createdBy?.id === task.assignee?.id ? "utworzyłeś i jesteś do niego przypisany" : task.assignee ? "jesteś do niego przypisany" : "utworzyłeś je"}.` : "Ładowanie szczegółów zadania..."}
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
              <Label htmlFor="description">Opis</Label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Wprowadź opis zadania"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusId} onValueChange={setStatusId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz status" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskStatuses.map((taskStatus) => (
                      <SelectItem key={taskStatus.id} value={taskStatus.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: taskStatus.color }}
                          />
                          <span>{taskStatus.name}</span>
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
              <Label htmlFor="assignee">Przypisany</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz przypisanego" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Nieprzypisany</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Termin wykonania</Label>
                <DatePicker
                  value={dueDate ? new Date(dueDate) : undefined}
                  onChange={(date) => setDueDate(date ? date.toISOString().split('T')[0] : '')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="estimatedHours">Szacowany czas</Label>
                <Select value={estimatedHours} onValueChange={setEstimatedHours}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz szacowany czas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Brak szacunku</SelectItem>
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

            <ImageGallery
              images={images}
              onImageUpload={handleImageUpload}
              onImageDelete={handleImageDelete}
              editable={true}
            />

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim() || !hasChanges}
            >
              {loading ? "Aktualizowanie..." : "Zaktualizuj zadanie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
