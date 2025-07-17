"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
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
        resetForm()
        onTaskCreated()
      } else {
        const data = await response.json()
        setError(data.error || "Nie udało się utworzyć zadania")
      }
    } catch (error) {
      setError("Wystąpił błąd. Spróbuj ponownie.")
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
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
