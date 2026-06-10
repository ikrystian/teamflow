"use client"

import { useState, useEffect } from "react"
import { useProjects } from "@/contexts/projects-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ProjectImageSelector } from "./project-image-selector"
import { ProjectIconSelector } from "./project-icon-selector"
import { ProjectClientSelect } from "./project-client-select"
import { editProjectSchema, type EditProjectFormData } from "@/lib/project-validations"
import { type Project } from "@/types" // Import from types

interface EditProjectSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectUpdated: () => void
  project: Project | null
}

export function EditProjectSheet({
  open,
  onOpenChange,
  onProjectUpdated,
  project
}: EditProjectSheetProps) {
  const { refreshProjects } = useProjects()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [color, setColor] = useState("#3B82F6")
  const [icon, setIcon] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Partial<EditProjectFormData>>({})

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || "")
      setImageUrl(project.imageUrl || null)
      setColor(project.color || "#3B82F6")
      setIcon(project.icon || null)
      setClientId(project.clientId ?? project.client?.id ?? null)
      setError("")
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return

    setLoading(true)
    setError("")
    setFieldErrors({})

    // Validate form data
    const validation = editProjectSchema.safeParse({
      name,
      description: description || undefined,
      imageUrl,
      color,
      icon,
      clientId
    })

    if (!validation.success) {
      const errors: Partial<EditProjectFormData> = {}
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof EditProjectFormData] = issue.message
        }
      })
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      })

      if (response.ok) {
        // Odśwież globalny stan projektów
        refreshProjects()
        onProjectUpdated()
        handleClose(false)
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

  const handleClose = (open: boolean) => {
    if (!open) {
      setError("")
    }
    onOpenChange(open)
  }

  if (!project) return null

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-left">Edytuj projekt</SheetTitle>
          <SheetDescription className="text-left">
            Zaktualizuj informacje o projekcie. Zmiany będą widoczne dla wszystkich członków zespołu.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 py-4 px-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nazwa projektu</Label>
            <Input
              id="edit-name"
              placeholder="Wprowadź nazwę projektu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className={fieldErrors.name ? "border-destructive" : ""}
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-description">Opis (opcjonalnie)</Label>
            <Textarea
              id="edit-description"
              placeholder="Wprowadź opis projektu"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={loading}
              className={fieldErrors.description ? "border-destructive" : ""}
            />
            {fieldErrors.description && (
              <p className="text-sm text-destructive">{fieldErrors.description}</p>
            )}
          </div>

          <ProjectClientSelect
            value={clientId}
            onChange={setClientId}
            disabled={loading}
          />

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

          <ProjectIconSelector
            selectedIcon={icon}
            onIconChange={setIcon}
          />

          <ProjectImageSelector
            selectedImageUrl={imageUrl}
            onImageChange={setImageUrl}
          />

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </form>

        <SheetFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            onClick={handleSubmit}
          >
            {loading ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
