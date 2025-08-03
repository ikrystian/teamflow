"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Clock, Timer } from "lucide-react"
import type { Todo } from "@/types"

interface TaskTodosProps {
  taskId: string
  todos: Todo[]
  onTodosChange: (todos: Todo[]) => void
}

export function TaskTodos({ taskId, todos: initialTodos, onTodosChange }: TaskTodosProps) {
  const [todos, setTodos] = useState(initialTodos)
  const [newTodoTitle, setNewTodoTitle] = useState("")
  const [timeInputs, setTimeInputs] = useState<Record<string, string>>({})
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({})

  // Sync internal state when todos prop changes
  useEffect(() => {
    setTodos(initialTodos)
  }, [initialTodos])

  const completedTodos = todos.filter(todo => todo.isCompleted).length
  const todoProgress = todos.length > 0 ? (completedTodos / todos.length) * 100 : 0

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;
    const response = await fetch(`/api/tasks/${taskId}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTodoTitle }),
    });
    if (response.ok) {
      const newTodo = await response.json();
      const updatedTodos = [...todos, newTodo];
      setTodos(updatedTodos);
      onTodosChange(updatedTodos);
      setNewTodoTitle('');
    }
  };

  const handleToggleTodo = async (todoId: string, isCompleted: boolean) => {
    const response = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted }),
    });
    if (response.ok) {
      const updatedTodo = await response.json();
      const updatedTodos = todos.map(todo =>
        todo.id === updatedTodo.id ? updatedTodo : todo
      );
      setTodos(updatedTodos);
      onTodosChange(updatedTodos);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    const response = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      const updatedTodos = todos.filter(todo => todo.id !== todoId);
      setTodos(updatedTodos);
      onTodosChange(updatedTodos);
    }
  };

  const handleAddTime = async (todoId: string) => {
    const timeValue = timeInputs[todoId];
    if (!timeValue || isNaN(parseFloat(timeValue))) return;

    const hours = parseFloat(timeValue);
    const todo = todos.find(t => t.id === todoId);
    const newTimeSpent = (todo?.timeSpent || 0) + hours;

    const response = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeSpent: newTimeSpent }),
    });

    if (response.ok) {
      const updatedTodo = await response.json();
      const updatedTodos = todos.map(todo =>
        todo.id === updatedTodo.id ? updatedTodo : todo
      );
      setTodos(updatedTodos);
      onTodosChange(updatedTodos);
      setTimeInputs(prev => ({ ...prev, [todoId]: '' }));
      setOpenPopovers(prev => ({ ...prev, [todoId]: false }));
    }
  };

  const handleTimeInputChange = (todoId: string, value: string) => {
    setTimeInputs(prev => ({ ...prev, [todoId]: value }));
  };

  const togglePopover = (todoId: string) => {
    setOpenPopovers(prev => ({ ...prev, [todoId]: !prev[todoId] }));
  };

  const getTotalTimeSpent = () => {
    return todos.reduce((total, todo) => total + (todo.timeSpent || 0), 0);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">
          Lista do zrobienia ({completedTodos}/{todos.length})
        </h4>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            <span>{getTotalTimeSpent().toFixed(1)}h</span>
          </div>
          <span>•</span>
          <span>{Math.round(todoProgress)}% ukończono</span>
        </div>
      </div>
      <Progress value={todoProgress} className="mb-3" />
      <div className="space-y-2">
        {todos.map(todo => (
          <div key={todo.id} className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-gray-50">
            <Checkbox
              id={`todo-${todo.id}`}
              checked={todo.isCompleted}
              onCheckedChange={(checked) => handleToggleTodo(todo.id, !!checked)}
            />
            <label
              htmlFor={`todo-${todo.id}`}
              className={`flex-1 text-sm cursor-pointer ${todo.isCompleted ? "line-through text-gray-500" : "text-gray-900"
                }`}
            >
              {todo.title}
            </label>

            {/* Time tracking */}
            <div className="flex items-center gap-1">
              {todo.timeSpent && todo.timeSpent > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {todo.timeSpent.toFixed(1)}h
                </Badge>
              )}

              <Popover open={openPopovers[todo.id]} onOpenChange={() => togglePopover(todo.id)}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Clock className="h-3 w-3 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`time-${todo.id}`} className="text-xs font-medium">
                        Dodaj przepracowany czas
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`time-${todo.id}`}
                          type="number"
                          step="0.25"
                          min="0"
                          max="24"
                          placeholder="np. 1.5"
                          value={timeInputs[todo.id] || ''}
                          onChange={(e) => handleTimeInputChange(todo.id, e.target.value)}
                          className="h-8 text-xs"
                        />
                        <span className="text-xs text-gray-500">h</span>
                      </div>
                    </div>

                    {todo.timeSpent && todo.timeSpent > 0 && (
                      <div className="text-xs text-gray-500">
                        Łącznie: {todo.timeSpent.toFixed(1)}h
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddTime(todo.id)}
                        disabled={!timeInputs[todo.id] || isNaN(parseFloat(timeInputs[todo.id]))}
                        className="h-7 text-xs"
                      >
                        Dodaj
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePopover(todo.id)}
                        className="h-7 text-xs"
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Button variant="ghost" size="icon" onClick={() => handleDeleteTodo(todo.id)} className="h-6 w-6">
              <Trash2 className="h-3 w-3 text-gray-500" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center space-x-2 p-2">
        <Input
          placeholder="Dodaj nowy element..."
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
        />
        <Button onClick={handleAddTodo}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj
        </Button>
      </div>
    </div>
  )
}
