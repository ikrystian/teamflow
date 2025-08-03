"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getPriorityColor, getPriorityDisplayName, getPriorityOptions } from "@/lib/task-utils"
import { formatTaskDueDateWithRelative, dateToLocalDateString } from "@/lib/date-utils"
import type { User, TaskStatus } from "@/types"
import { UserPlus } from "lucide-react"

interface EditableCellProps {
  value: string | number | undefined
  type: "text" | "number" | "select" | "date" | "user" | "priority" | "status"
  options?: Array<{ value: string; label: string; color?: string }>
  users?: User[]
  taskStatuses?: TaskStatus[]
  onSave: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function EditableCell({
  value,
  type,
  options = [],
  users = [],
  taskStatuses = [],
  onSave,
  className,
  placeholder,
  disabled = false
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<string | number | undefined>(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    onSave(String(editValue || ""))
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const renderDisplayValue = () => {
    switch (type) {
      case "text":
        return value || placeholder || "Kliknij aby edytować"

      case "number":
        return value || placeholder || "Kliknij aby edytować"

      case "date":
        return value ? formatTaskDueDateWithRelative(String(value)) : placeholder || "Ustaw termin"

      case "user":
        if (value && users.length > 0) {
          const user = users.find(u => u.id === value)
          if (user) {
            return (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all duration-200">
                    <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                    <AvatarFallback className="text-xs">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-medium">{user.name}</span>
                </TooltipContent>
              </Tooltip>
            )
          }
        }
        return (
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all duration-200">
                <AvatarFallback className="text-xs">
                  <UserPlus className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <span>{placeholder || "Przypisz osobę"}</span>
            </TooltipContent>
          </Tooltip>
        )

      case "priority":
        return value ? (
          <Badge variant="outline" className={`text-xs ${getPriorityColor(String(value))}`}>
            {getPriorityDisplayName(String(value))}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">{placeholder || "Ustaw priorytet"}</span>
        )

      case "status":
        if (value && taskStatuses.length > 0) {
          const status = taskStatuses.find(s => s.id === value)
          if (status) {
            return (
              <span className="text-sm">{status.name}</span>
            )
          }
        }
        return <span className="text-muted-foreground text-sm">{placeholder || "Ustaw status"}</span>

      case "select":
        const option = options.find(o => o.value === value)
        return option ? option.label : (placeholder || "Wybierz opcję")

      default:
        return value || placeholder || "Kliknij aby edytować"
    }
  }

  const renderEditor = () => {
    switch (type) {
      case "text":
        return (
          <Input
            ref={inputRef}
            value={editValue || ""}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-8"
          />
        )

      case "number":
        return (
          <Input
            ref={inputRef}
            type="number"
            value={editValue || ""}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-8 max-w-[60px]"
            min="0"

            step="0.5"
          />
        )

      case "date":
        return (
          <DatePicker
            value={editValue ? new Date(editValue) : undefined}
            onChange={(date) => {
              const dateValue = date ? dateToLocalDateString(date) : ""
              setEditValue(dateValue)
              onSave(dateValue)
              setIsEditing(false)
            }}
            className="h-8"
          />
        )

      case "user":
        return (
          <Select
            value={String(editValue || "unassigned")}
            onValueChange={(value) => {
              const finalValue = value === "unassigned" ? "" : value
              setEditValue(finalValue)
              onSave(finalValue)
              setIsEditing(false)
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Wybierz osobę" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Nieprzypisany</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {user.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "priority":
        return (
          <Select
            value={String(editValue || "none")}
            onValueChange={(value) => {
              const finalValue = value === "none" ? "" : value
              setEditValue(finalValue)
              onSave(finalValue)
              setIsEditing(false)
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Wybierz priorytet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Brak priorytetu</SelectItem>
              {getPriorityOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${option.color}`} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "status":
        return (
          <Select
            value={String(editValue || "")}
            onValueChange={(value) => {
              setEditValue(value)
              onSave(value)
              setIsEditing(false)
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Wybierz status" />
            </SelectTrigger>
            <SelectContent>
              {taskStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "select":
        return (
          <Select
            value={String(editValue || "")}
            onValueChange={(value) => {
              setEditValue(value)
              onSave(value)
              setIsEditing(false)
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      default:
        return null
    }
  }

  if (isEditing) {
    return (
      <div className={cn("min-w-0", className)}>
        {renderEditor()}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "editable-cell rounded pl-2 pr-0 py-1 min-h-[32px] flex items-center",
        !disabled && "cursor-pointer hover:bg-muted/50",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
      onClick={() => !disabled && setIsEditing(true)}
    >
      {renderDisplayValue()}
    </div>
  )
}
