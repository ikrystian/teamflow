"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from "lucide-react"
import { TaskDetailsSheet } from "./task-details-sheet"
import { TaskPopover } from "./task-popover"
import type { Task, TaskStatus } from "@/types"

interface TasksWeeklyCalendarProps {
  tasks: Task[]
  onTaskUpdated: () => void
}

export function TasksWeeklyCalendar({ tasks, onTaskUpdated }: TasksWeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }, [])

  useEffect(() => {
    fetchTaskStatuses()
  }, [fetchTaskStatuses])

  // Funkcja do pobierania początku tygodnia (poniedziałek)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Poniedziałek jako pierwszy dzień
    return new Date(d.setDate(diff))
  }

  // Funkcja do pobierania dni roboczych tygodnia (Pn-Pt)
  const getWeekDays = (weekStart: Date) => {
    const days = []
    for (let i = 0; i < 5; i++) { // Tylko dni robocze (Pn-Pt)
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      days.push(day)
    }
    return days
  }

  // Funkcja do pobierania zadań dla konkretnego dnia
  const getTasksForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate).toISOString().split('T')[0]
      return taskDate === dateString
    })
  }

  // Nawigacja tygodniowa
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7)
      } else {
        newDate.setDate(newDate.getDate() + 7)
      }
      return newDate
    })
  }

  // Przejście do bieżącego tygodnia
  const goToCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  // Obsługa kliknięcia w zadanie
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
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

  // Sprawdzenie czy zadanie jest przeterminowane
  const isOverdue = (dueDate: string, task: Task) => {
    // Don't show completed tasks as overdue
    if (task.statusId && taskStatuses.length > 0) {
      const doneStatus = taskStatuses.find(status => status.name === "Done")
      if (doneStatus && task.statusId === doneStatus.id) {
        return false
      }
    }

    const today = new Date()
    const due = new Date(dueDate)
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    return due < today
  }

  // Kolory priorytetów
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const weekStart = getWeekStart(currentWeek)
  const weekDays = getWeekDays(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 4) // Piątek

  const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek']

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Kalendarz tygodniowy
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                Dzisiaj
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(weekStart)} - {formatDate(weekEnd)} {weekStart.getFullYear()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {weekDays.map((day, index) => {
              const tasksForDay = getTasksForDate(day)
              const todayClass = isToday(day) ? 'bg-blue-50 border-blue-200' : 'border-gray-200'

              return (
                <div key={day.toISOString()} className={`border rounded-lg p-3 min-h-[200px] ${todayClass}`}>
                  <div className="mb-3">
                    <h3 className={`font-medium text-sm ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                      {dayNames[index]}
                    </h3>
                    <p className={`text-lg font-semibold ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {tasksForDay.map(task => (
                      <TaskPopover
                        key={task.id}
                        task={task}
                        onTaskClick={handleTaskClick}
                        side="right"
                        align="start"
                      >
                        <div
                          className={`p-2 rounded-md border cursor-pointer hover:shadow-sm transition-shadow ${
                            isOverdue(task.dueDate!, task) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                          }`}
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-gray-900 line-clamp-2">
                              {task.title}
                            </h4>

                            {task.project && (
                              <p className="text-xs text-gray-500 truncate">
                                {task.project.name}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              {task.priority && (
                                <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                                  {task.priority === "Low" ? "N" : task.priority === "Medium" ? "Ś" : "W"}
                                </Badge>
                              )}

                              {task.assignee && (
                                <div className="flex items-center space-x-1">
                                  <User className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500 truncate max-w-[60px]">
                                    {task.assignee.name?.split(' ')[0]}
                                  </span>
                                </div>
                              )}
                            </div>

                            {isOverdue(task.dueDate!, task) && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-600">Przeterminowane</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TaskPopover>
                    ))}

                    {tasksForDay.length === 0 && (
                      <div className="text-center py-4">
                        <CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Brak zadań</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
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
