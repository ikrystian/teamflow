"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from "lucide-react"
import { QuickAddTaskCalendar } from "./quick-add-task-calendar"
import type { Task, TaskStatus, TaskUpdateData } from "@/types"
import type { Session } from "next-auth"
import { TaskDetailsDialog } from "./task-details-dialog"

interface TasksWeeklyCalendarProps {
  tasks: Task[]
  onTaskUpdated: () => void
  onTaskUpdate?: (taskId: string, updates: TaskUpdateData) => void
  projects?: Array<{
    id: string
    name: string

  }>
  session?: Session | null
  hideProjectSelect?: boolean
}

export function TasksWeeklyCalendar({
  tasks,
  onTaskUpdated,
  onTaskUpdate,
  projects = [],
  session = null,
  hideProjectSelect = false
}: TasksWeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

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
    fetchTaskStatuses()
    checkAdminStatus()
  }, [fetchTaskStatuses, checkAdminStatus])

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

  // Check if user can edit task
  const canEditTask = (task: Task) => {
    if (!session?.user?.id) return false

    // Admin can edit all tasks
    if (isAdmin) return true

    // User can edit tasks they created or are assigned to
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

    // Task is overdue one day after the due date
    const overdueDate = new Date(due)
    overdueDate.setDate(due.getDate() + 1)

    return today >= overdueDate
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
                <div key={day.toISOString()} className={`border rounded-lg p-3 min-h-[280px] flex flex-col ${todayClass}`}>
                  <div className="mb-3">
                    <h3 className={`font-medium text-sm ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                      {dayNames[index]}
                    </h3>
                    <p className={`text-lg font-semibold ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </p>
                  </div>

                  <div className="space-y-2 flex-1">
                    {tasksForDay.map(task => (
                      <div></div>
                    ))}

                    {tasksForDay.length === 0 && (
                      <div className="text-center py-4">
                        <CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Brak zadań</p>
                      </div>
                    )}

                    {/* Pole dodawania zadania */}
                    <div className="mt-auto pt-2">
                      <QuickAddTaskCalendar
                        date={day}
                        onTaskCreated={onTaskUpdated}
                        projects={projects}
                        session={session}
                        hideProjectSelect={hideProjectSelect}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sheet szczegółów zadania */}
      {selectedTask && (
        <TaskDetailsDialog
          task={selectedTask}
          open={taskDetailsDialogOpen}
          onOpenChange={setTaskDetailsDialogOpen}
          onTaskUpdated={onTaskUpdated}
        />
      )}
    </>
  )
}
