"use client"

import { useState } from "react"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ProjectImageSelector } from "./project-image-selector"

interface Team {
  id: string
  name: string
}

interface CreateProjectSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: () => void
  teams: Team[]
}

export function CreateProjectSheet({
  open,
  onOpenChange,
  onProjectCreated,
  teams
}: CreateProjectSheetProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [teamId, setTeamId] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [color, setColor] = useState("#3B82F6")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          teamId,
          imageUrl,
          color
        }),
      })

      if (response.ok) {
        setName("")
        setDescription("")
        setTeamId("")
        setImageUrl(null)
        setColor("#3B82F6")
        onProjectCreated()
        handleClose()
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

  const handleClose = () => {
    setName("")
    setDescription("")
    setTeamId("")
    setImageUrl(null)
    setColor("#3B82F6")
    setError("")
    onOpenChange(false)
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
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-left">Utwórz nowy projekt</SheetTitle>
          <SheetDescription className="text-left">
            Utwórz nowy projekt, aby organizować zadania i współpracować z zespołem.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 py-4 px-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nazwa projektu</Label>
            <Input
              id="name"
              placeholder="Wprowadź nazwę projektu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
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
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="team">Zespół</Label>
            <Select value={teamId} onValueChange={setTeamId} required disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz zespół" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <ProjectImageSelector
            selectedImageUrl={imageUrl}
            onImageChange={setImageUrl}
          />

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
            disabled={loading || !name.trim() || !teamId}
            onClick={handleSubmit}
          >
            {loading ? "Tworzenie..." : "Utwórz projekt"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
