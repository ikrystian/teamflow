"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Check, X } from "lucide-react"
import { toast } from "sonner"
import type { Session } from "next-auth"

interface QuickAddTaskCalendarProps {
  date: Date
  onTaskCreated: () => void
  projects: Array<{
    id: string
    name: string
    team: {
      id: string
      name: string
    }
  }>
  session: Session | null
  hideProjectSelect?: boolean
}

export function QuickAddTaskCalendar({
  date,
  onTaskCreated,
  projects,
  session,
  hideProjectSelect = false
}: QuickAddTaskCalendarProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Set default project when projects change
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError("")

    try {
      // Format date to YYYY-MM-DD for dueDate
      const formattedDate = date.toISOString().split('T')[0]

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          projectId: selectedProjectId && selectedProjectId !== "no-project" ? selectedProjectId : undefined,
          dueDate: formattedDate,
          assigneeId: session?.user?.id // Automatycznie przypisz do autora
        }),
      })

      if (response.ok) {
        setTitle("")
        setIsAdding(false)
        setError("")
        toast.success("Zadanie zostało utworzone")
        onTaskCreated()
      } else {
        const data = await response.json()
        const errorMessage = data.error || "Nie udało się utworzyć zadania"
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Error creating task:", error)
      const errorMessage = "Wystąpił błąd podczas tworzenia zadania"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setTitle("")
    setIsAdding(false)
    setError("")
  }

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="w-full justify-start text-muted-foreground hover:text-foreground text-xs h-6 px-2"
      >
        <Plus className="mr-1 h-3 w-3" />
        Dodaj zadanie
      </Button>
    )
  }

  return (
    <Card className="mb-2">
      <CardContent className="p-2">
        <form onSubmit={handleSubmit}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Wpisz nazwę zadania..."
            className="mb-2 text-xs h-7"
            autoFocus
            disabled={loading}
          />
          {!hideProjectSelect && projects.length > 0 && (
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={loading}>
              <SelectTrigger className="mb-2 text-xs h-7">
                <SelectValue placeholder="Wybierz projekt (opcjonalne)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-project">
                  <span className="text-muted-foreground">Brak projektu</span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} • {project.team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {error && (
            <div className="text-xs text-red-600 mb-2 p-1 bg-red-50 rounded border">
              {error}
            </div>
          )}
          <div className="flex gap-1">
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || (!hideProjectSelect && !selectedProjectId) || loading}
              className="h-6 px-2"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
              className="h-6 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
