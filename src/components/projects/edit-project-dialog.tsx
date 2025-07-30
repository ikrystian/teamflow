"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProjectImageSelector } from "./project-image-selector"

interface Team {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  description?: string
  imageUrl?: string
  color?: string
  team: {
    id: string
    name: string
  }
}

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectUpdated: () => void
  project: Project | null
  teams: Team[]
}

export function EditProjectDialog({
  open,
  onOpenChange,
  onProjectUpdated,
  project
}: EditProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [color, setColor] = useState("#3B82F6")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || "")
      setImageUrl(project.imageUrl || null)
      setColor(project.color || "#3B82F6")
      setError("")
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          imageUrl,
          color
        }),
      })

      if (response.ok) {
        onProjectUpdated()
        handleClose()
      } else {
        const data = await response.json()
        setError(data.error || "Nie udało się zaktualizować projektu")
      }
    } catch {
      setError("Wystąpił błąd podczas aktualizacji projektu")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    onOpenChange(false)
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edytuj projekt</DialogTitle>
          <DialogDescription>
            Zaktualizuj informacje o projekcie. Zmiany będą widoczne dla wszystkich członków zespołu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nazwa projektu</Label>
              <Input
                id="edit-name"
                placeholder="Wprowadź nazwę projektu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Opis (opcjonalnie)</Label>
              <Textarea
                id="edit-description"
                placeholder="Wprowadź opis projektu"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Zespół</Label>
              <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                {project?.team.name}
              </div>
              <p className="text-xs text-muted-foreground">
                Zespół nie może być zmieniony po utworzeniu projektu
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-color">Kolor projektu</Label>
              <div className="grid grid-cols-6 gap-2">
                {[
                  "#3B82F6", // Blue
                  "#10B981", // Emerald
                  "#F59E0B", // Amber
                  "#EF4444", // Red
                  "#8B5CF6", // Violet
                  "#EC4899", // Pink
                  "#06B6D4", // Cyan
                  "#84CC16", // Lime
                  "#F97316", // Orange
                  "#6366F1", // Indigo
                  "#14B8A6", // Teal
                  "#A855F7", // Purple
                ].map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === colorOption ? "border-gray-900 scale-110" : "border-gray-300 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: colorOption }}
                    onClick={() => setColor(colorOption)}
                    disabled={loading}
                  />
                ))}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Label htmlFor="edit-custom-color" className="text-sm">Własny kolor:</Label>
                <input
                  id="edit-custom-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded border"
                  disabled={loading}
                />
              </div>
            </div>

            <ProjectImageSelector
              selectedImageUrl={imageUrl}
              onImageChange={setImageUrl}
            />

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
