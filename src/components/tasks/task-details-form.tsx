"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Check, X } from "lucide-react"
import { format } from "date-fns"
import { pl } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Task, User, TaskStatus, TaskUpdateData } from "@/types"
import { getPriorityColor, getPriorityDisplayName } from "@/lib/task-format-utils"

interface TaskDetailsFormProps {
  task: Task
  users: User[]
  taskStatuses: TaskStatus[]
  onSave: (updates: TaskUpdateData) => void
  onCancel: () => void
  disabled?: boolean
}

export function TaskDetailsForm({
  task,
  users,
  taskStatuses,
  onSave,
  onCancel,
  disabled = false
}: TaskDetailsFormProps) {
  const [formData, setFormData] = useState({
    assigneeId: task.assignee?.id || "",
    dueDate: task.dueDate || "",
    priority: task.priority || "",
    statusId: task.statusId || "",
    estimatedHours: task.estimatedHours?.toString() || ""
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Reset form when task changes
  useEffect(() => {
    setFormData({
      assigneeId: task.assignee?.id || "",
      dueDate: task.dueDate || "",
      priority: task.priority || "",
      statusId: task.statusId || "",
      estimatedHours: task.estimatedHours?.toString() || ""
    })
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || disabled) return

    setLoading(true)

    try {
      const updates: TaskUpdateData = {}

      // Only include changed fields
      if (formData.assigneeId !== (task.assignee?.id || "")) {
        updates.assigneeId = formData.assigneeId || undefined
      }
      if (formData.dueDate !== (task.dueDate || "")) {
        updates.dueDate = formData.dueDate || undefined
      }
      if (formData.priority !== (task.priority || "")) {
        updates.priority = formData.priority || undefined
      }
      if (formData.statusId !== (task.statusId || "")) {
        updates.statusId = formData.statusId || undefined
      }
      if (formData.estimatedHours !== (task.estimatedHours?.toString() || "")) {
        updates.estimatedHours = formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined
      }

      // Only save if there are changes
      if (Object.keys(updates).length > 0) {
        await onSave(updates)
        toast.success("Szczegóły zadania zostały zaktualizowane")
      } else {
        toast.info("Brak zmian do zapisania")
      }
    } catch (error) {
      console.error("Error saving task details:", error)
      toast.error("Nie udało się zapisać zmian")
    } finally {
      setLoading(false)
    }
  }

  const selectedUser = users.find(u => u.id === formData.assigneeId)
  const selectedStatus = taskStatuses.find(s => s.id === formData.statusId)
  const selectedDate = formData.dueDate ? new Date(formData.dueDate) : undefined

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Assignee */}
      <div className="space-y-2">
        <Label htmlFor="assignee" className="text-xs font-medium text-muted-foreground">
          Przypisana osoba
        </Label>
        <Select
          value={formData.assigneeId}
          onValueChange={(value) => setFormData(prev => ({ ...prev, assigneeId: value }))}
          disabled={loading || disabled}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Wybierz osobę">
              {selectedUser && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedUser.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {selectedUser.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{selectedUser.name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nieprzypisany</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Due Date */}
      <div className="space-y-2">
        <Label htmlFor="dueDate" className="text-xs font-medium text-muted-foreground">
          Termin wykonania
        </Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-8 w-full justify-start text-left font-normal text-xs",
                !selectedDate && "text-muted-foreground"
              )}
              disabled={loading || disabled}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {selectedDate ? (
                format(selectedDate, "PPP", { locale: pl })
              ) : (
                "Wybierz termin"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setFormData(prev => ({
                  ...prev,
                  dueDate: date ? date.toISOString().split('T')[0] : ""
                }))
                setIsCalendarOpen(false)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority" className="text-xs font-medium text-muted-foreground">
          Priorytet
        </Label>
        <Select
          value={formData.priority}
          onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
          disabled={loading || disabled}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Wybierz priorytet">
              {formData.priority && (
                <Badge variant="secondary" className={`text-xs ${getPriorityColor(formData.priority)}`}>
                  {getPriorityDisplayName(formData.priority)}
                </Badge>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Brak priorytetu</SelectItem>
            <SelectItem value="low">Niski</SelectItem>
            <SelectItem value="medium">Średni</SelectItem>
            <SelectItem value="high">Wysoki</SelectItem>
            <SelectItem value="urgent">Pilny</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status" className="text-xs font-medium text-muted-foreground">
          Status
        </Label>
        <Select
          value={formData.statusId}
          onValueChange={(value) => setFormData(prev => ({ ...prev, statusId: value }))}
          disabled={loading || disabled}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Wybierz status">
              {selectedStatus && (
                <Badge
                  variant="default"
                  className="text-white text-xs"
                  style={{ backgroundColor: selectedStatus.color }}
                >
                  {selectedStatus.name}
                </Badge>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {taskStatuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                <Badge
                  variant="default"
                  className="text-white text-xs"
                  style={{ backgroundColor: status.color }}
                >
                  {status.name}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estimated Hours */}
      <div className="space-y-2">
        <Label htmlFor="estimatedHours" className="text-xs font-medium text-muted-foreground">
          Szacowany czas (godziny)
        </Label>
        <Input
          id="estimatedHours"
          type="number"
          min="0"
          step="0.5"
          value={formData.estimatedHours}
          onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
          placeholder="np. 2.5"
          className="h-8 text-xs"
          disabled={loading || disabled}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          type="submit"
          size="sm"
          className="flex-1 h-8 text-xs"
          disabled={loading || disabled}
        >
          <Check className="mr-1 h-3 w-3" />
          {loading ? "Zapisywanie..." : "Zapisz"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="mr-1 h-3 w-3" />
          Anuluj
        </Button>
      </div>
    </form>
  )
}
