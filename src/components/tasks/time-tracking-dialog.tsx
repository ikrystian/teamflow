"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Clock, Trash2, Plus } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface TimeEntry {
  id: string
  hours: number
  description?: string
  date: string
  user: User
}

interface Task {
  id: string
  title: string
  estimatedHours?: number
}

interface TimeTrackingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTimeLogged: () => void
  task: Task | null
}

export function TimeTrackingDialog({
  open,
  onOpenChange,
  onTimeLogged,
  task
}: TimeTrackingDialogProps) {
  const [hours, setHours] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState<Date | undefined>()
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [totalHours, setTotalHours] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [error, setError] = useState("")

  // Set default date to today
  useEffect(() => {
    setDate(new Date())
  }, [])

  const fetchTimeEntries = useCallback(async () => {
    if (!task) return

    setLoadingEntries(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/time-entries`)
      if (response.ok) {
        const data = await response.json()
        setTimeEntries(data.timeEntries)
        setTotalHours(data.totalHours)
      }
    } catch (error) {
      console.error("Błąd podczas pobierania wpisów czasu:", error)
    } finally {
      setLoadingEntries(false)
    }
  }, [task])

  // Fetch time entries when dialog opens
  useEffect(() => {
    if (open && task) {
      fetchTimeEntries()
    }
  }, [open, task, fetchTimeEntries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/tasks/${task.id}/time-entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hours: parseFloat(hours),
          description: description.trim() || undefined,
          date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        }),
      })

      if (response.ok) {
        setHours("")
        setDescription("")
        fetchTimeEntries() // Refresh the list
        onTimeLogged()
      } else {
        const data = await response.json()
        setError(data.error || "Nie udało się zalogować czasu")
      }
    } catch {
      setError("Wystąpił błąd. Spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${task.id}/time-entries?entryId=${entryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchTimeEntries() // Refresh the list
        onTimeLogged()
      }
    } catch (error) {
      console.error("Błąd podczas usuwania wpisu czasu:", error)
    }
  }

  const handleClose = () => {
    setHours("")
    setDescription("")
    setError("")
    onOpenChange(false)
  }

  const formatHours = (hours: number) => {
    if (hours === 1) return "1 godzina"
    if (hours < 1) return `${Math.round(hours * 60)} minut`
    return `${hours} godzin`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getProgressColor = () => {
    if (!task?.estimatedHours) return "bg-blue-500"
    const percentage = (totalHours / task.estimatedHours) * 100
    if (percentage <= 50) return "bg-green-500"
    if (percentage <= 100) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getProgressPercentage = () => {
    if (!task?.estimatedHours) return 0
    return Math.min((totalHours / task.estimatedHours) * 100, 100)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Śledzenie czasu - {task?.title}
          </DialogTitle>
          <DialogDescription>
            Zaloguj czas spędzony na tym zadaniu i przeglądaj swoje wpisy czasu.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        {task?.estimatedHours && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Postęp</span>
              <span>{formatHours(totalHours)} / {formatHours(task.estimatedHours)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor()}`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Log Time Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="hours">Spędzony czas</Label>
              <Select value={hours} onValueChange={setHours} required>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz czas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">30 minut</SelectItem>
                  <SelectItem value="1">1 godzina</SelectItem>
                  <SelectItem value="1.5">1.5 godziny</SelectItem>
                  <SelectItem value="2">2 godziny</SelectItem>
                  <SelectItem value="2.5">2.5 godziny</SelectItem>
                  <SelectItem value="3">3 godziny</SelectItem>
                  <SelectItem value="3.5">3.5 godziny</SelectItem>
                  <SelectItem value="4">4 godziny</SelectItem>
                  <SelectItem value="4.5">4.5 godziny</SelectItem>
                  <SelectItem value="5">5 godzin</SelectItem>
                  <SelectItem value="5.5">5.5 godziny</SelectItem>
                  <SelectItem value="6">6 godzin</SelectItem>
                  <SelectItem value="6.5">6.5 godziny</SelectItem>
                  <SelectItem value="7">7 godzin</SelectItem>
                  <SelectItem value="7.5">7.5 godziny</SelectItem>
                  <SelectItem value="8">8 godzin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <DatePicker
                value={date}
                onChange={setDate}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Opis (Opcjonalnie)</Label>
            <Textarea
              id="description"
              placeholder="Nad czym pracowałeś?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {loading ? "Logowanie..." : "Zaloguj czas"}
          </Button>
        </form>

        {/* Time Entries History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Wpisy czasu</h3>
            <Badge variant="secondary">
              Łącznie: {formatHours(totalHours)}
            </Badge>
          </div>

          {loadingEntries ? (
            <div className="text-center py-4 text-gray-500">Ładowanie wpisów czasu...</div>
          ) : timeEntries.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.user.avatarUrl} alt={entry.user.name} />
                      <AvatarFallback className="text-xs">
                        {entry.user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatHours(entry.hours)}</span>
                        <span className="text-sm text-gray-500">dnia {formatDate(entry.date)}</span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-gray-600">{entry.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">Brak wpisów czasu</div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
