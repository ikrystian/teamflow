"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet"
import { TaskPopover } from "@/components/tasks/task-popover"
import { usePageHeader } from "@/contexts/header-context"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import type { Task } from "@/types"
import { formatTaskDueDate } from "@/lib/date-utils"

export function CalendarContent() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

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
        // Filter tasks that have due dates
        const tasksWithDueDates = data.tasks.filter((task: Task) => task.dueDate)
        setTasks(tasksWithDueDates)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getTasksForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate).toISOString().split('T')[0]
      return taskDate === dateString
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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const monthNames = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ]

  const dayNames = ["Niedz.", "Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."]

  const handleTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailsDialogOpen(true)
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


              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {dayNames.map(day => (
                      <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before the first day of the month */}
                    {Array.from({ length: firstDay }).map((_, index) => (
                      <div key={`empty-${index}`} className="h-24 p-1"></div>
                    ))}

                    {/* Days of the month */}
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                      const day = index + 1
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                      const tasksForDay = getTasksForDate(date)
                      const isToday = date.toDateString() === today.toDateString()

                      return (
                        <div
                          key={day}
                          className={`h-24 p-1 border rounded-lg ${isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
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
                                side="bottom"
                                align="start"
                              >
                                <div
                                  className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate cursor-pointer hover:bg-blue-200 transition-colors"
                                  onClick={() => handleTaskDetails(task)}
                                >
                                  {task.title}
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
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming tasks */}
              <Card>
                <CardHeader>
                  <CardTitle>Nadchodzące zadania</CardTitle>
                </CardHeader>
                <CardContent>
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
                                {task?.project?.name} • {task?.project?.team?.name}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {task.priority && (
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority === "High" ? "Wysoki" : task.priority === "Medium" ? "Średni" : "Niski"}
                                </Badge>
                              )}
                              <span className="text-sm text-gray-500">
                                {task.dueDate ? formatTaskDueDate(task.dueDate) : 'Brak terminu'}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
      </div>

      {/* Task Details Sheet */}
      {selectedTask && (
        <TaskDetailsSheet
          task={selectedTask as Task}
          open={taskDetailsDialogOpen}
          onOpenChange={setTaskDetailsDialogOpen}
        />
      )}
    </>
  )
}
