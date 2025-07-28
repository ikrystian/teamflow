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

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: () => void
  teams: Team[]
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
  teams
}: CreateProjectDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Utwórz nowy projekt</DialogTitle>
          <DialogDescription>
            Utwórz nowy projekt, aby organizować zadania i współpracować z zespołem.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nazwa projektu</Label>
              <Input
                id="name"
                placeholder="Wprowadź nazwę projektu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="team">Zespół</Label>
              <Select value={teamId} onValueChange={setTeamId} required>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !teamId}>
              {loading ? "Tworzenie..." : "Utwórz projekt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
