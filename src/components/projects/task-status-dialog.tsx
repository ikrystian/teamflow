"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface TaskStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusSaved: () => void
  projectId: string
  status?: TaskStatus | null
}

const predefinedColors = [
  "#6B7280", // Gray
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#EC4899", // Pink
]

export function TaskStatusDialog({
  open,
  onOpenChange,
  onStatusSaved,
  projectId,
  status
}: TaskStatusDialogProps) {
  const [name, setName] = useState("")
  const [color, setColor] = useState("#6B7280")
  const [isDefault, setIsDefault] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isEditing = !!status

  useEffect(() => {
    if (status) {
      setName(status.name)
      setColor(status.color)
      setIsDefault(status.isDefault)
    } else {
      setName("")
      setColor("#6B7280")
      setIsDefault(false)
    }
    setError("")
  }, [status, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!name.trim()) {
      setError("Nazwa statusu jest wymagana")
      setLoading(false)
      return
    }

    try {
      const url = isEditing
        ? `/api/projects/${projectId}/task-statuses/${status.id}`
        : `/api/projects/${projectId}/task-statuses`

      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          color,
          isDefault,
        }),
      })

      if (response.ok) {
        onStatusSaved()
        handleClose()
      } else {
        const data = await response.json()
        setError(data.error || `Nie udało się ${isEditing ? "zaktualizować" : "utworzyć"} statusu`)
      }
    } catch (e) {
      setError("Wystąpił błąd. Spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName("")
    setColor("#6B7280")
    setIsDefault(false)
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj status zadania" : "Utwórz status zadania"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Zaktualizuj konfigurację statusu zadania."
              : "Utwórz nowy status zadania dla tego projektu."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Nazwa statusu</Label>
              <Input
                id="name"
                placeholder="np. Weryfikacja, Testowanie, Zablokowane"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Kolor</Label>
              <div className="grid grid-cols-6 gap-2">
                {predefinedColors.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === colorOption
                        ? "border-gray-900 scale-110"
                        : "border-gray-300 hover:border-gray-400"
                    } transition-all`}
                    style={{ backgroundColor: colorOption }}
                    onClick={() => setColor(colorOption)}
                  />
                ))}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Label htmlFor="custom-color" className="text-sm">
                  Niestandardowy:
                </Label>
                <Input
                  id="custom-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-8 p-1 border rounded"
                />
                <span className="text-sm text-gray-500">{color}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              />
              <Label htmlFor="isDefault" className="text-sm">
                Ustaw jako domyślny status dla nowych zadań
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing
                  ? "Aktualizowanie..."
                  : "Tworzenie..."
                : isEditing
                ? "Zaktualizuj status"
                : "Utwórz status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
