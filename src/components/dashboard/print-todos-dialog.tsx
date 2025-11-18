"use client"

import { useState } from "react"
import { Task } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, CheckCircle2, Circle } from "lucide-react"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"

interface PrintTodosDialogProps {
  tasks: Task[]
}

export function PrintTodosDialog({ tasks }: PrintTodosDialogProps) {
  const [open, setOpen] = useState(false)

  // Filter tasks that are due today
  const todaysTasks = tasks.filter(task => {
    if (!task.dueDate) return false

    const dueDate = new Date(task.dueDate)
    const today = new Date()

    // Normalize dates to compare date-only (not timestamps)
    dueDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    // Check if the due date is today
    return dueDate.getTime() === today.getTime()
  })

  const totalTodos = todaysTasks.reduce((sum, task) => sum + (task.todos?.length || 0), 0)
  const completedTodos = todaysTasks.reduce(
    (sum, task) => sum + (task.todos?.filter(todo => todo.isCompleted).length || 0),
    0
  )

  const handlePrint = () => {
    window.print()
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          Drukuj listę zadań
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle>Lista zadań na dzisiaj</DialogTitle>
          <DialogDescription>
            {todaysTasks.length === 0 ? (
              "Brak zadań na dzisiaj"
            ) : (
              <>
                {todaysTasks.length} {todaysTasks.length === 1 ? 'zadanie' : todaysTasks.length < 5 ? 'zadania' : 'zadań'}
                {totalTodos > 0 && (
                  <> • {totalTodos} {totalTodos === 1 ? 'todo' : 'todos'} ({completedTodos} ukończonych)</>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="print-content">
          {/* Print Header */}
          <div className="hidden print:block mb-8">
            <h1 className="text-3xl font-bold mb-2">Lista zadań</h1>
            <p className="text-lg text-gray-600">{getTodayDate()}</p>
            <div className="mt-4 flex gap-4 text-sm">
              <span>Zadań: {todaysTasks.length}</span>
              {totalTodos > 0 && (
                <>
                  <span>• Wszystkich todos: {totalTodos}</span>
                  <span>• Ukończonych: {completedTodos}</span>
                  <span>• Do zrobienia: {totalTodos - completedTodos}</span>
                </>
              )}
            </div>
            <hr className="my-4 border-gray-300" />
          </div>

          {todaysTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Brak zadań na dzisiaj</p>
            </div>
          ) : (
            <div className="space-y-6">
              {todaysTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 print:border-gray-300 print:break-inside-avoid">
                  {/* Task Header */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.project?.color || '#3B82F6' }}
                      />
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground print:text-gray-600">
                      {task.project && (
                        <span>Projekt: {task.project.name}</span>
                      )}
                      {task.assignee && (
                        <span>• Przypisany: {task.assignee.name}</span>
                      )}
                      {task.dueDate && (
                        <span className="print:hidden">• {formatTaskDueDateWithRelative(task.dueDate)}</span>
                      )}
                      {task.priority && (
                        <span>• Priorytet: {task.priority}</span>
                      )}
                    </div>
                  </div>

                  {/* Todos List */}
                  {task.todos && task.todos.length > 0 && (
                    <div className="space-y-2">
                      {task.todos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 print:hover:bg-transparent"
                        >
                          {todo.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5 print:text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5 print:text-gray-400" />
                          )}
                          <div className="flex-1">
                            <p className={`${todo.isCompleted ? 'line-through text-muted-foreground print:text-gray-500' : ''}`}>
                              {todo.title}
                            </p>
                            {todo.timeSpent !== undefined && todo.timeSpent > 0 && (
                              <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">
                                Czas: {todo.timeSpent}h
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 print:hidden">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Zamknij
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Drukuj
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
