"use client"

import { useState } from "react"
import { useProjects } from "@/contexts/projects-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ProjectImageSelector } from "./project-image-selector"
import { ProjectIconSelector } from "./project-icon-selector"
import { ProjectClientSelect } from "./project-client-select"
import { createProjectSchema, type CreateProjectFormData } from "@/lib/project-validations"

interface CreateProjectContentProps {
  onProjectCreated: () => void
  onClose?: () => void
  showIconSelector?: boolean
}

export function CreateProjectContent({
  onProjectCreated,
  onClose,
  showIconSelector = true
}: CreateProjectContentProps) {
  const { refreshProjects } = useProjects()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [color, setColor] = useState("#3B82F6")
  const [icon, setIcon] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Partial<CreateProjectFormData>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setFieldErrors({})

    // Validate form data
    const validation = createProjectSchema.safeParse({
      name,
      description: description || undefined,
      imageUrl,
      color,
      icon: showIconSelector ? icon : null,
      clientId
    })

    if (!validation.success) {
      const errors: Partial<CreateProjectFormData> = {}
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof CreateProjectFormData] = issue.message
        }
      })
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      })

      if (response.ok) {
        resetForm()
        // Odśwież globalny stan projektów
        refreshProjects()
        onProjectCreated()
        onClose?.()
      } else {
        const data = await response.json()
        setError(data.error || "Nie udało się utworzyć projektu")
      }
    } catch {
      setError("Failed to create project")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setImageUrl(null)
    setColor("#3B82F6")
    setIcon(null)
    setClientId(null)
    setError("")
    setFieldErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose?.()
  }

  const predefinedColors = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#8B5CF6", // Purple
    "#F97316", // Orange
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#EC4899", // Pink
    "#6B7280", // Gray
    "#14B8A6", // Teal
    "#F43F5E", // Rose
  ]

  return (
    <>
      {/* Header Section */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Utwórz nowy projekt</h2>
        <p className="text-muted-foreground">
          Utwórz nowy projekt, aby organizować zadania i współpracować z zespołem.
        </p>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="name">Nazwa projektu</Label>
          <Input
            id="name"
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
          <Label htmlFor="description">Opis (opcjonalnie)</Label>
          <Textarea
            id="description"
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
          <Label htmlFor="color">Kolor projektu</Label>
          <div className="grid grid-cols-6 gap-2">
            {predefinedColors.map((predefinedColor) => (
              <button
                key={predefinedColor}
                type="button"
                className={`w-8 h-8 rounded-full border-2 ${
                  color === predefinedColor ? "border-gray-900" : "border-gray-300"
                }`}
                style={{ backgroundColor: predefinedColor }}
                onClick={() => setColor(predefinedColor)}
                disabled={loading}
              />
            ))}
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Label htmlFor="custom-color" className="text-sm">Własny kolor:</Label>
            <input
              id="custom-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded border"
              disabled={loading}
            />
          </div>
        </div>

        {showIconSelector && (
          <ProjectIconSelector
            selectedIcon={icon}
            onIconChange={setIcon}
          />
        )}

        <ProjectImageSelector
          selectedImageUrl={imageUrl}
          onImageChange={setImageUrl}
        />

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim()}
          >
            {loading ? "Tworzenie..." : "Utwórz projekt"}
          </Button>
        </div>
      </form>
    </>
  )
}