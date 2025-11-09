"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Clock, Play, Pause, Save, X, ChevronUp, ChevronDown, Search } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  project?: {
    id: string
    name: string
    color?: string
  }
}

interface TimerState {
  selectedTask: Task | null
  description: string
  isRunning: boolean
  startTime: number | null  // timestamp kiedy timer został uruchomiony
  accumulatedSeconds: number  // sekundy przed ostatnim startem
  isMinimized: boolean
  isVisible: boolean
}

const STORAGE_KEY = "time-tracker-widget-state"

export function TimeTrackerWidget() {
  const { data: session } = useSession() as { data: Session | null }
  const [isMinimized, setIsMinimized] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [description, setDescription] = useState("")
  const [tasks, setTasks] = useState<Task[]>([])
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0)
  const isInitialized = useRef(false)

  // Fetch tasks for selection - only tasks assigned to current user
  const fetchTasks = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/tasks?assigneeId=${session.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Load state from localStorage on mount
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    try {
      const savedState = localStorage.getItem(STORAGE_KEY)
      if (savedState) {
        const state: TimerState = JSON.parse(savedState)

        setSelectedTask(state.selectedTask)
        setDescription(state.description)
        setIsMinimized(state.isMinimized)
        setIsVisible(state.isVisible)
        setAccumulatedSeconds(state.accumulatedSeconds)

        // If timer was running, calculate elapsed time
        if (state.isRunning && state.startTime) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
          setSeconds(state.accumulatedSeconds + elapsed)
          setStartTime(state.startTime)
          setIsRunning(true)
        } else {
          setSeconds(state.accumulatedSeconds)
          setIsRunning(false)
          setStartTime(null)
        }
      }
    } catch (error) {
      console.error("Error loading timer state:", error)
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized.current) return

    const state: TimerState = {
      selectedTask,
      description,
      isRunning,
      startTime,
      accumulatedSeconds,
      isMinimized,
      isVisible,
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error("Error saving timer state:", error)
    }
  }, [selectedTask, description, isRunning, startTime, accumulatedSeconds, isMinimized, isVisible])

  // Timer logic - update seconds based on startTime
  useEffect(() => {
    if (!isRunning || !startTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setSeconds(accumulatedSeconds + elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, startTime, accumulatedSeconds])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartPause = () => {
    if (!selectedTask) {
      toast.error("Wybierz zadanie, aby rozpocząć śledzenie czasu")
      return
    }

    if (isRunning) {
      // Pause - save current time as accumulated
      const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
      setAccumulatedSeconds(accumulatedSeconds + elapsed)
      setStartTime(null)
      setIsRunning(false)
    } else {
      // Start - record start time
      setStartTime(Date.now())
      setIsRunning(true)
    }
  }

  const handleSave = async () => {
    if (!selectedTask) {
      toast.error("Nie wybrano zadania")
      return
    }

    if (seconds === 0) {
      toast.error("Nie można zapisać zerowego czasu")
      return
    }

    setIsSaving(true)
    const hours = seconds / 3600

    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}/time-entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hours: parseFloat(hours.toFixed(2)),
          description: description.trim() || undefined,
          date: new Date().toISOString().split('T')[0],
        }),
      })

      if (response.ok) {
        toast.success("Czas został zapisany")
        // Reset state
        setSeconds(0)
        setAccumulatedSeconds(0)
        setIsRunning(false)
        setStartTime(null)
        setDescription("")
        setSelectedTask(null)
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się zapisać czasu")
      }
    } catch (error) {
      console.error("Error saving time:", error)
      toast.error("Wystąpił błąd podczas zapisywania")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSeconds(0)
    setAccumulatedSeconds(0)
    setIsRunning(false)
    setStartTime(null)
    setDescription("")
  }

  // Don't show widget if user is not logged in
  if (!session?.user?.id) {
    return null
  }

  if (!isVisible) {
    return null
  }

  return (
    <Card
      className={cn(
        "fixed bottom-6 right-6 z-50 shadow-2xl border-2 transition-all duration-300",
        isMinimized ? "w-64" : "w-96"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Śledzenie czasu</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-7 w-7 p-0"
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-4 space-y-4">
          {/* Task Selection */}
          <div className="space-y-2">
            <Label className="text-xs">Zadanie</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between text-xs h-9"
                  disabled={isRunning}
                >
                  {selectedTask ? (
                    <span className="truncate">
                      {selectedTask.project && (
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: selectedTask.project.color || "#3B82F6" }}
                        />
                      )}
                      {selectedTask.title}
                    </span>
                  ) : (
                    "Wybierz zadanie..."
                  )}
                  <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Szukaj zadania..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nie znaleziono zadań.</CommandEmpty>
                    <CommandGroup>
                      {tasks.map((task) => (
                        <CommandItem
                          key={task.id}
                          value={task.title}
                          onSelect={() => {
                            setSelectedTask(task)
                            setOpen(false)
                          }}
                        >
                          {task.project && (
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: task.project.color || "#3B82F6" }}
                            />
                          )}
                          <span className="truncate">{task.title}</span>
                          {task.project && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {task.project.name}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Timer Display */}
          <div className="flex items-center justify-center py-4">
            <div className="text-4xl font-mono font-bold tabular-nums tracking-wider">
              {formatTime(seconds)}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Button
              onClick={handleStartPause}
              className="flex-1"
              variant={isRunning ? "outline" : "default"}
              size="sm"
              disabled={isSaving}
            >
              {isRunning ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pauza
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </>
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              disabled={seconds === 0 || isSaving}
            >
              Reset
            </Button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs">
              Opis (opcjonalny)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nad czym pracowałeś?"
              rows={2}
              className="text-xs resize-none"
              disabled={isSaving}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full"
            variant="default"
            disabled={!selectedTask || seconds === 0 || isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Zapisywanie..." : "Zapisz czas"}
          </Button>
        </div>
      )}

      {/* Minimized View */}
      {isMinimized && (
        <div className="p-3 flex items-center justify-between">
          <div className="text-2xl font-mono font-bold tabular-nums">
            {formatTime(seconds)}
          </div>
          <Button
            onClick={handleStartPause}
            size="sm"
            variant={isRunning ? "outline" : "default"}
            className="h-8 px-3"
            disabled={!selectedTask}
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </Card>
  )
}
