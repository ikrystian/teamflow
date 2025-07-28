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
import { Switch } from "@/components/ui/switch"


interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface SystemTaskStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusSaved: () => void
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

export function SystemTaskStatusDialog({
  open,
  onOpenChange,
  onStatusSaved,
  status
}: SystemTaskStatusDialogProps) {
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
        ? `/api/system/task-statuses/${status.id}`
        : `/api/system/task-statuses`

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
    } catch {
      setError("Wystąpił błąd podczas zapisywania statusu")
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj status zadania" : "Dodaj nowy status zadania"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Zaktualizuj szczegóły statusu zadania."
              : "Utwórz nowy globalny status zadania dla wszystkich projektów."
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nazwa statusu</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. W trakcie przeglądu"
                disabled={loading}
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
                      color === colorOption ? "border-gray-900" : "border-gray-300"
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

            <div className="flex items-center space-x-2">
              <Switch
                id="is-default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
                disabled={loading}
              />
              <Label htmlFor="is-default">Status domyślny dla nowych zadań</Label>
            </div>

            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Zapisywanie..." : (isEditing ? "Zaktualizuj" : "Utwórz")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
