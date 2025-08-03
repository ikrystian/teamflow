"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet"
import { TaskPopover } from "@/components/tasks/task-popover"
import { usePageHeader } from "@/contexts/header-context"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import type { Task, TaskUpdateData } from "@/types"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"
import { getPriorityColor, getPriorityDisplayName, formatProjectDisplay } from "@/lib/task-format-utils"

export function CalendarContent() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<Array<{
    id: string
    name: string
    email: string
    avatarUrl?: string
  }>>([])
  const [session, setSession] = useState<{ user?: { id: string } } | null>(null)

  // Set page header content
  usePageHeader(
    <div>
      <h1 className="text-2xl font-bold text-foreground">Wyświetl zadania według daty ich wykonania</h1>
    </div>,
    [] // Static content, no dependencies
  )

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        // Filter tasks that have due dates or start times
        const tasksWithDates = data.tasks.filter((task: Task) => task.dueDate || task.startTime)
        setTasks(tasksWithDates)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/session")
      if (response.ok) {
        const data = await response.json()
        setSession(data)
      }
    } catch (error) {
      console.error("Error fetching session:", error)
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: TaskUpdateData) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        fetchTasks() // Refresh to get updated data
      } else {
        throw new Error("Failed to update task")
      }
    } catch (error) {
      console.error("Error updating task:", error)
      throw error
    }
  }

  const handleTimeLogged = () => {
    fetchTasks() // Refresh to get updated time data
  }

  useEffect(() => {
    fetchTasks()
    fetchUsers()
    fetchSession()
  }, [])

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    // Convert Sunday (0) to 6, and shift Monday (1) to 0, Tuesday (2) to 1, etc.
    return firstDay === 0 ? 6 : firstDay - 1
  }

  const getTasksForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      // Use startTime if available, otherwise fall back to dueDate
      const taskDateField = task.startTime || task.dueDate
      if (!taskDateField) return false
      const taskDate = new Date(taskDateField).toISOString().split('T')[0]
      return taskDate === dateString
    }).sort((a, b) => {
      // Sort by start time if available, otherwise by due date
      const aTime = a.startTime || a.dueDate
      const bTime = b.startTime || b.dueDate
      if (!aTime || !bTime) return 0
      return new Date(aTime).getTime() - new Date(bTime).getTime()
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }


  const monthNames = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ]

  const dayNames = ["Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."]

  const formatStartTime = (startTime?: string) => {
    if (!startTime) return null
    const date = new Date(startTime)
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const handleTaskDetails = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
  }

  // Check if user can edit task
  const canEditTask = (task: Task) => {
    if (!session?.user?.id) return false

    // User can edit tasks they created or are assigned to
    return task.createdBy?.id === session.user.id || task.assignee?.id === session.user.id
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const today = new Date()

  if (loading) {
    return <PageLoadingLayout variant="calendar" />
  }

  return (
    <>
      <div className="space-y-6 p-4 md:p-8 pt-6">
        <div>
          <div>
            <div className="flex items-center justify-between">
              <div className="text-xl">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-6 gap-1 mb-4">
              {dayNames.map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-6 gap-1">
              {/* Empty cells for days before the first day of the month */}
              {Array.from({ length: firstDay }).map((_, index) => (
                <div key={`empty-${index}`} className="h-24 p-1"></div>
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                const dayOfWeek = date.getDay()

                // Skip Sundays (dayOfWeek === 0)
                if (dayOfWeek === 0) {
                  return null
                }

                const tasksForDay = getTasksForDate(date)
                const isToday = date.toDateString() === today.toDateString()

                return (
                  <div
                    key={day}
                    className={`h-[20vh] p-1 border rounded-lg ${isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                      }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {tasksForDay.slice(0, 2).map(task => (
                        <TaskPopover
                          key={task.id}
                          task={task}
                          onTaskClick={handleTaskDetails}
                          onTaskUpdate={handleTaskUpdate}
                          onTimeLogged={handleTimeLogged}
                          users={users}
                          canEdit={canEditTask(task)}
                          side="bottom"
                          align="start"
                        >
                          <div
                            className="text-xs p-1 rounded bg-white border-l-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            style={{ borderLeftColor: task.project?.color || '#3B82F6' }}
                            onClick={() => handleTaskDetails(task)}
                          >
                            <div className="flex items-center gap-1">
                              {formatStartTime(task.startTime) && (
                                <span className="text-xs font-medium text-gray-600 shrink-0">
                                  {formatStartTime(task.startTime)}
                                </span>
                              )}
                              <span className="truncate">{task.title}</span>
                            </div>
                          </div>
                        </TaskPopover>
                      ))}
                      {tasksForDay.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{tasksForDay.length - 2} więcej
                        </div>
                      )}
                    </div>
                  </div>
                )
              }).filter(Boolean)}
            </div>
          </div>
        </div>

        {/* Upcoming tasks */}
        <div>
          <div>
            <div className="text-xl">Nadchodzące zadania</div>
          </div>
          <div>
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nie znaleziono zadań z terminami wykonania</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks
                  .filter(task => task.dueDate)
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .slice(0, 10)
                  .map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleTaskDetails(task)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <p className="text-sm text-gray-500">
                          {formatProjectDisplay(task.project)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {task.priority && (
                          <Badge className={getPriorityColor(task.priority)}>
                            {getPriorityDisplayName(task.priority)}
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500">
                          {task.dueDate ? formatTaskDueDateWithRelative(task.dueDate) : 'Brak terminu'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Details Sheet */}
      {selectedTask && (
        <TaskDetailsSheet
          task={selectedTask as Task}
          open={taskDetailsDialogOpen}
          onOpenChange={setTaskDetailsDialogOpen}
          onTaskUpdated={fetchTasks}
        />
      )}
    </>
  )
}
