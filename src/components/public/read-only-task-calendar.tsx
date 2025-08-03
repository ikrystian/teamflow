"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Clock, User, Eye } from "lucide-react"
import type { Task } from "@/types"
import { formatAssignee, getPriorityColor } from "@/lib/task-format-utils"

interface ReadOnlyTaskCalendarProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

export function ReadOnlyTaskCalendar({ tasks, onTaskClick }: ReadOnlyTaskCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())

  // Funkcja do pobierania początku tygodnia (poniedziałek)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(d.setDate(diff))
  }

  // Generowanie dni tygodnia (Pn-Pt)
  const getWeekDays = (startDate: Date) => {
    const days = []
    for (let i = 0; i < 5; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  // Filtrowanie zadań dla konkretnego dnia
  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return taskDate.toDateString() === date.toDateString()
    })
  }

  // Nawigacja tygodniowa
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  const weekStart = getWeekStart(currentWeek)
  const weekDays = getWeekDays(weekStart)

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

  // Formatowanie zakresu tygodnia
  const formatWeekRange = () => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 4)

    return `${weekStart.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long'
    })} - ${weekEnd.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}`
  }

  return (
    <div className="space-y-4">
      {/* Header z nawigacją */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Kalendarz zadań</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatWeekRange()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
              >
                Dzisiaj
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Kalendarz tygodniowy */}
      <div className="grid grid-cols-5 gap-4">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day)
          const dayName = day.toLocaleDateString('pl-PL', { weekday: 'short' })

          return (
            <Card
              key={index}
              className={`min-h-[300px] ${isToday(day) ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="text-center">
                  <div className={`text-sm font-medium ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                    {dayName}
                  </div>
                  <div className={`text-lg font-bold ${isToday(day) ? 'text-primary' : ''}`}>
                    {formatDate(day)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {dayTasks.length === 0 ? (
                  <div className="text-center text-muted-foreground text-xs py-4">
                    Brak zadań
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="cursor-pointer hover:shadow-sm transition-shadow border-l-4 p-2"
                      style={{ borderLeftColor: task.project?.color || '#3B82F6' }}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-medium line-clamp-2 leading-tight">
                            {task.title}
                          </h4>
                          {task.priority && (
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${getPriorityColor(task.priority)}`}
                            >
                              {task.priority}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="truncate max-w-16">
                              {formatAssignee(task.assignee).displayName}
                            </span>
                          </div>

                          {task.startTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(task.startTime).toLocaleTimeString('pl-PL', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            onTaskClick?.(task)
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Szczegóły
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
