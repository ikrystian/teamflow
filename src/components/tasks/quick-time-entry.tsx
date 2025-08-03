"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Plus, Check, X } from "lucide-react"
import { toast } from "sonner"
import type { Task } from "@/types"

interface QuickTimeEntryProps {
  task: Task
  onTimeLogged: () => void
  disabled?: boolean
}

export function QuickTimeEntry({ task, onTimeLogged, disabled = false }: QuickTimeEntryProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [hours, setHours] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hours || parseFloat(hours) <= 0) return

    setLoading(true)

    try {
      const response = await fetch(`/api/tasks/${task.id}/time-entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hours: parseFloat(hours),
          description: description.trim() || undefined,
          date: new Date().toISOString().split('T')[0],
        }),
      })

      if (response.ok) {
        setHours("")
        setDescription("")
        setIsAdding(false)
        toast.success("Czas został zalogowany")
        onTimeLogged()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się zalogować czasu")
      }
    } catch {
      toast.error("Wystąpił błąd. Spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setHours("")
    setDescription("")
    setIsAdding(false)
  }

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        disabled={disabled}
        className="w-full justify-start text-muted-foreground hover:text-foreground text-xs h-6 px-2"
      >
        <Plus className="mr-1 h-3 w-3" />
        Dodaj czas
      </Button>
    )
  }

  return (
    <div className="space-y-2 p-2 border rounded-md bg-muted/20">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select value={hours} onValueChange={setHours} required disabled={loading}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Czas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.25">15 min</SelectItem>
              <SelectItem value="0.5">30 min</SelectItem>
              <SelectItem value="0.75">45 min</SelectItem>
              <SelectItem value="1">1h</SelectItem>
              <SelectItem value="1.5">1.5h</SelectItem>
              <SelectItem value="2">2h</SelectItem>
              <SelectItem value="2.5">2.5h</SelectItem>
              <SelectItem value="3">3h</SelectItem>
              <SelectItem value="4">4h</SelectItem>
              <SelectItem value="6">6h</SelectItem>
              <SelectItem value="8">8h</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-1">
            <Button
              type="submit"
              size="sm"
              disabled={loading || !hours}
              className="h-7 px-2 flex-1"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
              className="h-7 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opis (opcjonalny)"
          className="h-7 text-xs"
          disabled={loading}
        />
      </form>
    </div>
  )
}
