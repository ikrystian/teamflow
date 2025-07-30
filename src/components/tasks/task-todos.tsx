"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Trash2, Plus } from "lucide-react"
import type { Todo } from "@/types"

interface TaskTodosProps {
  taskId: string
  todos: Todo[]
  onTodosChange: (todos: Todo[]) => void
}

export function TaskTodos({ taskId, todos: initialTodos, onTodosChange }: TaskTodosProps) {
  const [todos, setTodos] = useState(initialTodos)
  const [newTodoTitle, setNewTodoTitle] = useState("")

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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">
          Lista do zrobienia ({completedTodos}/{todos.length})
        </h4>
        <span className="text-xs text-gray-500">
          {Math.round(todoProgress)}% ukończono
        </span>
      </div>
      <Progress value={todoProgress} className="mb-3" />
      <div className="space-y-2">
        {todos.map(todo => (
          <div key={todo.id} className="flex items-center space-x-2">
            <Checkbox
              id={`todo-${todo.id}`}
              checked={todo.isCompleted}
              onCheckedChange={(checked) => handleToggleTodo(todo.id, !!checked)}
            />
            <label
              htmlFor={`todo-${todo.id}`}
              className={`flex-1 text-sm ${todo.isCompleted ? "line-through text-gray-500" : "text-gray-900"
                }`}
            >
              {todo.title}
            </label>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteTodo(todo.id)}>
              <Trash2 className="h-4 w-4 text-gray-500" />
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
