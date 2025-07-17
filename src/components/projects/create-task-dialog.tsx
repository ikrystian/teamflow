"use client"

import { useState, useEffect } from "react"
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchTaskStatuses = async () => {
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
  }

  useEffect(() => {
    if (open && projectId) {
      fetchTaskStatuses()
    }
  }, [open, projectId])

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
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
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
