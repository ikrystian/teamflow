"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Calendar as CalendarIcon } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { TaskDetailsSheet } from "./task-details-sheet"
import { TaskPopover } from "./task-popover"
import type { Task, TaskUpdateData } from "@/types"
import type { Session } from "next-auth"
import { formatAssignee, getPriorityColor } from "@/lib/task-format-utils"

interface TasksHourlyCalendarProps {
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskUpdate?: (taskId: string, updates: TaskUpdateData) => void
  teamMembers?: Array<{
    id: string
    name: string
    email: string
    avatarUrl?: string
  }>
  projects?: Array<{
    id: string
    name: string
    team: {
      id: string
      name: string
    }
  }>
  session?: Session | null
  hideProjectSelect?: boolean
  onCreateTask?: (date: Date, hour: number) => void
}

export function TasksHourlyCalendar({
  tasks,
  onTaskUpdated,
  onTaskUpdate,
  teamMembers = [],
  session = null,
  onCreateTask,
}: TasksHourlyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week")

  const checkAdminStatus = useCallback(async () => {
    if (session?.user) {
      try {
        const response = await fetch('/api/user/admin-status')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }
  }, [session])

  useEffect(() => {
    checkAdminStatus()
  }, [checkAdminStatus])

  // Funkcja do pobierania początku tygodnia (poniedziałek)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  // Funkcja do pobierania dni na podstawie trybu widoku
  const getViewDays = (startDate: Date, mode: "day" | "week" | "month") => {
    const days = []

    if (mode === "day") {
      // Tylko jeden dzień
      days.push(new Date(startDate))
    } else if (mode === "week") {
      // 5 dni roboczych (Pn-Pt)
      for (let i = 0; i < 5; i++) {
        const day = new Date(startDate)
        day.setDate(startDate.getDate() + i)
        days.push(day)
      }
    } else if (mode === "month") {
      // Wszystkie dni miesiąca
      const year = startDate.getFullYear()
      const month = startDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d))
      }
    }

    return days
  }

  // Godziny do wyświetlenia (6:00 - 22:00)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6)

  // Funkcja do pobierania zadań dla konkretnego dnia i godziny
  const getTasksForDateTime = (date: Date, hour: number) => {
    const dateString = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      const taskDateString = taskDate.toISOString().split('T')[0]

      // Jeśli zadanie ma ustawiony startTime, używamy go
      if (task.startTime) {
        const startTime = new Date(task.startTime)
        return taskDateString === dateString && startTime.getHours() === hour
      }

      // W przeciwnym razie, jeśli ma tylko dueDate, pokazujemy o godzinie z dueDate
      if (taskDateString === dateString) {
        const taskHour = taskDate.getHours()
        return taskHour === hour
      }

      return false
    })
  }

  // Nawigacja
  const navigate = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev)
      if (viewMode === "day") {
        // Dla dnia, przesuwaj o 1 dzień
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 1)
        } else {
          newDate.setDate(newDate.getDate() + 1)
        }
      } else if (viewMode === "week") {
        // Dla tygodnia, przesuwaj o 7 dni
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 7)
        } else {
          newDate.setDate(newDate.getDate() + 7)
        }
      } else if (viewMode === "month") {
        // Dla miesiąca, przesuwaj o 1 miesiąc
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1)
        } else {
          newDate.setMonth(newDate.getMonth() + 1)
        }
      }
      return newDate
    })
  }

  // Przejście do dzisiaj
  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  // Obsługa kliknięcia w zadanie
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  // Check if user can edit task
  const canEditTask = (task: Task) => {
    if (!session?.user?.id) return false
    if (isAdmin) return true
    return task.createdBy?.id === session.user.id || task.assignee?.id === session.user.id
  }

  // Formatowanie daty
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short'
    })
  }

  // Sprawdzenie czy dzień jest dzisiaj
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Sprawdzenie czy godzina jest aktualna
  const isCurrentHour = (date: Date, hour: number) => {
    const now = new Date()
    return isToday(date) && now.getHours() === hour
  }

  // Obsługa kliknięcia w kafelek czasu
  const handleTimeSlotClick = (date: Date, hour: number, e: React.MouseEvent) => {
    // Nie otwieraj formularza jeśli kliknięto w zadanie
    const target = e.target as HTMLElement
    if (target.closest('[data-task-card]')) {
      return
    }

    if (onCreateTask) {
      onCreateTask(date, hour)
    }
  }

  // Oblicz dni do wyświetlenia w zależności od trybu
  const weekStart = viewMode === "month" ? currentWeek : getWeekStart(currentWeek)
  const viewDays = getViewDays(weekStart, viewMode)

  // Oblicz koniec zakresu dla nagłówka
  let rangeEnd: Date
  if (viewMode === "day") {
    rangeEnd = new Date(currentWeek)
  } else if (viewMode === "week") {
    rangeEnd = new Date(weekStart)
    rangeEnd.setDate(weekStart.getDate() + 4) // Piątek
  } else {
    // Dla miesiąca, pokaż cały miesiąc
    const year = currentWeek.getFullYear()
    const month = currentWeek.getMonth()
    rangeEnd = new Date(year, month + 1, 0)
  }

  // Nazwy dni dla nagłówków
  const getDayName = (date: Date) => {
    const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']
    return dayNames[date.getDay()]
  }

  // Tytuł widoku
  const getViewTitle = () => {
    if (viewMode === "day") {
      return formatDate(currentWeek)
    } else if (viewMode === "week") {
      return `${formatDate(weekStart)} - ${formatDate(rangeEnd)} ${weekStart.getFullYear()}`
    } else {
      return currentWeek.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Kalendarz
            </CardTitle>
            <div className="flex items-center space-x-2">
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "day" | "week" | "month")}>
                <ToggleGroupItem value="day" aria-label="Widok dnia" size="sm">
                  <CalendarDays className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="week" aria-label="Widok tygodnia" size="sm">
                  <CalendarRange className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="month" aria-label="Widok miesiąca" size="sm">
                  <CalendarIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Dzisiaj
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {getViewTitle()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[calc(100vh-300px)]">
            {/* Nagłówki dni */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="grid" style={{ gridTemplateColumns: `80px repeat(${viewDays.length}, 1fr)` }}>
                <div className="border-r p-2"></div>
                {viewDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-r ${
                      isToday(day) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`text-xs font-medium ${isToday(day) ? 'text-blue-600' : 'text-muted-foreground'}`}>
                      {getDayName(day)}
                    </div>
                    <div className={`text-lg font-semibold ${isToday(day) ? 'text-blue-600' : ''}`}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Siatka godzin */}
            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="grid border-b h-16" style={{ gridTemplateColumns: `80px repeat(${viewDays.length}, 1fr)` }}>
                  {/* Kolumna godzin */}
                  <div className="border-r p-2 text-xs text-muted-foreground text-right pr-2">
                    {hour}:00
                  </div>

                  {/* Kolumny dni */}
                  {viewDays.map((day) => {
                    const tasksForHour = getTasksForDateTime(day, hour)
                    const isCurrent = isCurrentHour(day, hour)

                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={`border-r p-1 cursor-pointer hover:bg-muted/30 transition-colors ${
                          isCurrent ? 'bg-blue-50/50' : ''
                        } ${isToday(day) ? 'bg-blue-50/20' : ''}`}
                        onClick={(e) => handleTimeSlotClick(day, hour, e)}
                      >
                        <div className="space-y-1">
                          {tasksForHour.map((task) => (
                            <TaskPopover
                              key={task.id}
                              task={task}
                              onTaskClick={handleTaskClick}
                              onTaskUpdate={onTaskUpdate}
                              onTimeLogged={onTaskUpdated}
                              users={teamMembers}
                              canEdit={canEditTask(task)}
                              side="right"
                              align="start"
                            >
                              <div
                                data-task-card
                                className="p-1.5 rounded border cursor-pointer hover:shadow-sm transition-shadow text-xs bg-white"
                                style={{
                                  borderLeftWidth: '3px',
                                  borderLeftColor: task.project?.color || '#3B82F6'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTaskClick(task)
                                }}
                              >
                                <div className="font-medium line-clamp-1 text-xs">
                                  {task.title}
                                </div>
                                {task.assignee && (
                                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {formatAssignee(task.assignee).displayName.split(' ')[0]}
                                  </div>
                                )}
                                {task.priority && (
                                  <Badge variant="outline" className={`text-xs h-4 px-1 mt-1 ${getPriorityColor(task.priority)}`}>
                                    {task.priority === "Low" ? "N" : task.priority === "Medium" ? "Ś" : "W"}
                                  </Badge>
                                )}
                              </div>
                            </TaskPopover>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sheet szczegółów zadania */}
      {selectedTask && (
        <TaskDetailsSheet
          task={selectedTask}
          open={taskDetailsDialogOpen}
          onOpenChange={setTaskDetailsDialogOpen}
          onTaskUpdated={onTaskUpdated}
        />
      )}
    </>
  )
}
