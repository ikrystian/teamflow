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



export function SystemTaskStatusDialog({
  open,
  onOpenChange,
  onStatusSaved,
  status
}: SystemTaskStatusDialogProps) {
  const [name, setName] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isEditing = !!status

  useEffect(() => {
    if (status) {
      setName(status.name)
      setIsDefault(status.isDefault)
    } else {
      setName("")
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
