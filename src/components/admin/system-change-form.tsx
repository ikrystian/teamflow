"use client"

import { useState } from "react"
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
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import type { SystemChange } from "@/types"

interface SystemChangeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (change: SystemChange) => void
}

export function SystemChangeForm({ open, onOpenChange, onSuccess }: SystemChangeFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error("Tytuł jest wymagany")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/admin/system-changes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          type: "info",
          isVisible: true
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Nie udało się dodać zmiany")
      }

      const data = await response.json()

      toast.success("Zmiana została dodana pomyślnie")

      // Reset form
      setFormData({
        title: "",
        description: ""
      })

      onOpenChange(false)
      onSuccess?.(data.systemChange)

    } catch (error) {
      console.error("Error creating system change:", error)
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Dodaj nową zmianę systemową
          </DialogTitle>
          <DialogDescription>
            Utwórz nową zmianę, która będzie widoczna w prawym sidebarze dla wszystkich użytkowników.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Wprowadź tytuł zmiany..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Opcjonalny opis zmiany..."
              rows={3}
            />
          </div>



          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Dodaj zmianę
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface SystemChangeFormTriggerProps {
  onSuccess?: (change: SystemChange) => void
}

export function SystemChangeFormTrigger({ onSuccess }: SystemChangeFormTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        Dodaj zmianę
      </Button>

      <SystemChangeForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  )
}
