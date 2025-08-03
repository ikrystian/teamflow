"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


import { cn } from "@/lib/utils"
import { getPriorityColor, getPriorityDisplayName, getPriorityOptions } from "@/lib/task-format-utils"
import { dateToLocalDateString } from "@/lib/date-utils"
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
        // Dla typu date zawsze wyświetlamy date picker zamiast tekstu
        return (
          <div className={disabled ? "opacity-60 pointer-events-none" : ""}>
            <DatePicker
              value={value ? new Date(value) : undefined}
              onChange={(date) => {
                if (!disabled) {
                  const dateValue = date ? dateToLocalDateString(date) : ""
                  onSave(dateValue)
                }
              }}
              className="h-8 w-full"
            />
          </div>
        )

      case "user":
        // Dla typu user zawsze wyświetlamy dropdown zamiast avatara
        return (
          <Select
            value={String(value || "unassigned")}
            onValueChange={(newValue) => {
              const finalValue = newValue === "unassigned" ? "" : newValue
              onSave(finalValue)
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder={placeholder || "Wybierz osobę"}>
                {value && users.length > 0 ? (() => {
                  const user = users.find(u => u.id === value)
                  if (user) {
                    return (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {user.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{user.name}</span>
                      </div>
                    )
                  }
                  return placeholder || "Wybierz osobę"
                })() : (placeholder || "Wybierz osobę")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                    <UserPlus className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span>Nieprzypisany</span>
                </div>
              </SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
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
        )

      case "priority":
        // Dla typu priority zawsze wyświetlamy dropdown zamiast badge
        return (
          <Select
            value={String(value || "none")}
            onValueChange={(newValue) => {
              const finalValue = newValue === "none" ? "" : newValue
              onSave(finalValue)
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder={placeholder || "Wybierz priorytet"}>
                {value ? (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(String(value))}`} />
                    <span className="text-sm">{getPriorityDisplayName(String(value))}</span>
                  </div>
                ) : (placeholder || "Wybierz priorytet")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <span>Brak priorytetu</span>
                </div>
              </SelectItem>
              {getPriorityOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${option.color}`} />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "status":
        // Dla typu status zawsze wyświetlamy dropdown zamiast tekstu
        return (
          <Select
            value={String(value || "")}
            onValueChange={(newValue) => {
              onSave(newValue)
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder={placeholder || "Wybierz status"}>
                {value && taskStatuses.length > 0 ? (() => {
                  const status = taskStatuses.find(s => s.id === value)
                  if (status) {
                    return (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color || '#6B7280' }}
                        />
                        <span className="text-sm">{status.name}</span>
                      </div>
                    )
                  }
                  return placeholder || "Wybierz status"
                })() : (placeholder || "Wybierz status")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {taskStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: status.color || '#6B7280' }}
                    />
                    <span>{status.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

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

  // Dla typów z bezpośrednimi kontrolkami nie używamy trybu edycji
  if (type === "user" || type === "priority" || type === "status" || type === "date") {
    return (
      <div className={cn("min-w-0", className)}>
        {renderDisplayValue()}
      </div>
    )
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
