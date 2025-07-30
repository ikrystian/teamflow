"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
import { Clock, Trash2 } from "lucide-react"
import type { Task } from "@/types"

interface TimeEntry {
  id: string
  hours: number
  description?: string
  date: string
  createdAt: string
  user: {
    id: string
    name: string
    avatarUrl?: string
  }
}

interface TimeTrackingSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTimeLogged: () => void
  task: Task | null
}

export function TimeTrackingSheet({
  open,
  onOpenChange,
  onTimeLogged,
  task
}: TimeTrackingSheetProps) {
  const [hours, setHours] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [totalHours, setTotalHours] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [error, setError] = useState("")

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }, [])

  // Fetch time entries when dialog opens
  useEffect(() => {
    const fetchTimeEntries = async () => {
      if (!task?.id || !open) return

      setLoadingEntries(true)
      try {
        const response = await fetch(`/api/tasks/${task.id}/time-entries`)
        if (response.ok) {
          const data = await response.json()
          setTimeEntries(data.timeEntries)
          setTotalHours(data.totalHours)
        }
      } catch (error) {
        console.error("Error fetching time entries:", error)
      } finally {
        setLoadingEntries(false)
      }
    }

    fetchTimeEntries()
  }, [task?.id, open])

  const fetchTimeEntries = async () => {
    if (!task?.id) return

    setLoadingEntries(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/time-entries`)
      if (response.ok) {
        const data = await response.json()
        setTimeEntries(data.timeEntries)
        setTotalHours(data.totalHours)
      }
    } catch (error) {
      console.error("Error fetching time entries:", error)
    } finally {
      setLoadingEntries(false)
    }
  }

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
          date: date,
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
      const response = await fetch(`/api/tasks/${task.id}/time-entries/${entryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchTimeEntries() // Refresh the list
        onTimeLogged()
      }
    } catch (error) {
      console.error("Error deleting time entry:", error)
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
    if (hours < 5) return `${hours} godziny`
    return `${hours} godzin`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Dzisiaj"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Wczoraj"
    } else {
      return date.toLocaleDateString()
    }
  }

  const getProgressColor = () => {
    if (!task?.estimatedHours) return "bg-blue-500"
    const percentage = (totalHours / task.estimatedHours) * 100
    if (percentage >= 100) return "bg-red-500"
    if (percentage >= 80) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getProgressPercentage = () => {
    if (!task?.estimatedHours) return 0
    return Math.min((totalHours / task.estimatedHours) * 100, 100)
  }

  if (!task) return null

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-left">
            <Clock className="h-5 w-5" />
            Śledzenie czasu - {task.title}
          </SheetTitle>
          <SheetDescription className="text-left">
            Zaloguj czas spędzony na tym zadaniu i przeglądaj swoje wpisy czasu.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 px-4">
          {/* Progress Bar */}
          {task.estimatedHours && (
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
                    <SelectItem value="0.25">15 minut</SelectItem>
                    <SelectItem value="0.5">30 minut</SelectItem>
                    <SelectItem value="0.75">45 minut</SelectItem>
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
                    <SelectItem value="7">7 godzin</SelectItem>
                    <SelectItem value="8">8 godzin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Opis (opcjonalny)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opisz wykonaną pracę..."
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <Button type="submit" disabled={loading || !hours} className="w-full">
              {loading ? "Logowanie..." : "Zaloguj czas"}
            </Button>
          </form>

          {/* Time Entries List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Historia wpisów czasu</h3>
              {totalHours > 0 && (
                <span className="text-sm text-muted-foreground">
                  Łącznie: {formatHours(totalHours)}
                </span>
              )}
            </div>

            {loadingEntries ? (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">Ładowanie wpisów...</div>
              </div>
            ) : timeEntries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Brak wpisów czasu dla tego zadania</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timeEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{formatHours(entry.hours)}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Dodane przez {entry.user.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Zamknij
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
