"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"

import { DateTimePicker } from "@/components/ui/datetime-picker"
import { dateToLocalDateString } from "@/lib/date-utils"
import type { Task, User, TaskStatus } from "@/types"
import { ReminderSettings } from "@/components/tasks/reminder-settings"
import { FileUpload } from "@/components/ui/file-upload"
import {
  getEstimatedHoursOptions,
  hoursToSelectValue,
  selectValueToHours,
  formatAssignee,
  getPriorityOptions,
  formatProjectDisplay
} from "@/lib/task-format-utils"

interface Project {
  id: string
  name: string
  team: {
    id: string
    name: string
  }
}

interface TaskFormContentProps {
  onTaskCreated?: () => void
  onTaskUpdated?: () => void
  onClose?: () => void

  // For create mode
  projects?: Project[]
  projectId?: string
  teamMembers?: User[]
  defaultStatusId?: string
  forceAssignToCurrentUser?: boolean
  defaultDate?: Date
  defaultStartTime?: Date
  defaultEndTime?: Date

  // For edit mode
  task?: Task | null

  // Mode determination
  mode: "create" | "edit"

  // Layout variant (reserved for future use)
  variant?: "dialog" | "sheet"
}

export function TaskFormContent({
  onTaskCreated,
  onTaskUpdated,
  onClose,
  projects = [],
  projectId,
  teamMembers = [],
  defaultStatusId,
  forceAssignToCurrentUser = false,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  task,
  mode,
}: TaskFormContentProps) {
  const { data: session } = useSession() as { data: Session | null }

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [statusId, setStatusId] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [priority, setPriority] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [startTime, setStartTime] = useState<Date | undefined>()
  const [endTime, setEndTime] = useState<Date | undefined>()
  const [estimatedHours, setEstimatedHours] = useState("")

  // Time planning mode state
  const [timePlanningMode, setTimePlanningMode] = useState<"reporting" | "scheduled">("reporting")

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderType, setReminderType] = useState("hours")
  const [reminderValue, setReminderValue] = useState(1)

  // Additional state
  const [, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // File upload state
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"

  // Determine if we should show project selector
  const showProjectSelector = ((isCreateMode && !projectId) || isEditMode) && projects.length > 0

  // Get current project for team member selection
  const currentProject = projectId
    ? { id: projectId, team: { members: teamMembers } }
    : projects.find(p => p.id === selectedProjectId)

  // Get team members for the current context
  const availableTeamMembers = projectId
    ? teamMembers
    : ('members' in (currentProject?.team || {}))
      ? (currentProject?.team as { members: User[] }).members
      : teamMembers

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/system/task-statuses')
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)

        // Set default status for create mode
        if (isCreateMode) {
          if (defaultStatusId) {
            setStatusId(defaultStatusId)
          } else {
            const defaultStatus = data.taskStatuses.find((status: TaskStatus) => status.isDefault)
            if (defaultStatus) {
              setStatusId(defaultStatus.id)
            } else if (data.taskStatuses.length > 0) {
              setStatusId(data.taskStatuses[0].id)
            }
          }
        }

        // Set status for edit mode
        if (isEditMode && task) {
          if (task.statusId) {
            setStatusId(task.statusId)
          } else {
            const defaultStatus = data.taskStatuses.find((s: TaskStatus) => s.isDefault)
            if (defaultStatus) {
              setStatusId(defaultStatus.id)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }, [isCreateMode, isEditMode, task, defaultStatusId])

  // Initialize form
  useEffect(() => {
    fetchTaskStatuses()

    if (isCreateMode) {
      // Reset form for create mode
      setTitle("")
      setDescription("")
      setSelectedProjectId(projectId || "")
      setAssigneeId(session?.user?.id || "")
      setPriority("")
      setDueDate(defaultDate ? dateToLocalDateString(defaultDate) : "")
      setStartTime(defaultStartTime || undefined)
      setEndTime(defaultEndTime || undefined)
      setEstimatedHours("")
      setTimePlanningMode(defaultStartTime && defaultEndTime ? "scheduled" : "reporting")
      setReminderEnabled(false)
      setReminderType("hours")
      setReminderValue(1)
      setError("")
    } else if (isEditMode && task) {
      // Populate form for edit mode
      setTitle(task.title)
      setDescription(task.description || "")
      setSelectedProjectId(task.project?.id || "")
      setAssigneeId(task.assignee?.id || "")
      setPriority(task.priority || "")
      setDueDate(task.dueDate ? dateToLocalDateString(new Date(task.dueDate)) : "")
      setStartTime(task.startTime ? new Date(task.startTime) : undefined)
      setEndTime(task.endTime ? new Date(task.endTime) : undefined)
      setEstimatedHours(hoursToSelectValue(task.estimatedHours))

      // Determine time planning mode based on existing data
      const hasScheduledTime = task.startTime && task.endTime
      setTimePlanningMode(hasScheduledTime ? "scheduled" : "reporting")

      setReminderEnabled(task.reminderEnabled || false)
      setReminderType(task.reminderType || "hours")
      setReminderValue(task.reminderValue || 1)
      setError("")
    }
  }, [isCreateMode, isEditMode, task, projectId, session?.user?.id, fetchTaskStatuses, defaultDate, defaultStartTime, defaultEndTime])

  // Force assign to current user when forceAssignToCurrentUser is true
  useEffect(() => {
    if (forceAssignToCurrentUser && isCreateMode && session?.user?.id) {
      setAssigneeId(session.user.id)
    }
  }, [forceAssignToCurrentUser, isCreateMode, session?.user?.id, selectedProjectId])

  // Calculate estimated hours from start and end time
  const calculateEstimatedHours = (start: Date, end: Date): number => {
    const diffInMs = end.getTime() - start.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    return Math.round(diffInHours * 2) / 2 // Round to nearest 0.5 hour
  }

  // Handle time planning mode change
  const handleTimePlanningModeChange = (mode: "reporting" | "scheduled") => {
    setTimePlanningMode(mode)

    if (mode === "reporting") {
      // Clear scheduled time fields when switching to reporting mode
      setStartTime(undefined)
      setEndTime(undefined)
    } else {
      // Clear estimated hours when switching to scheduled mode
      setEstimatedHours("")
    }
  }

  // Auto-calculate estimated hours when start/end time changes in scheduled mode
  useEffect(() => {
    if (timePlanningMode === "scheduled" && startTime && endTime && endTime > startTime) {
      const calculatedHours = calculateEstimatedHours(startTime, endTime)
      setEstimatedHours(hoursToSelectValue(calculatedHours))
    } else if (timePlanningMode === "scheduled" && (!startTime || !endTime || endTime <= startTime)) {
      // Clear estimated hours if times are invalid in scheduled mode
      setEstimatedHours("")
    }
  }, [startTime, endTime, timePlanningMode])

  // Sync due date with start time in scheduled mode if due date is not set
  useEffect(() => {
    if (timePlanningMode === "scheduled" && startTime && !dueDate) {
      setDueDate(dateToLocalDateString(startTime))
    }
  }, [startTime, timePlanningMode, dueDate])

  const handleReminderChange = (enabled: boolean, type: string, value: number) => {
    setReminderEnabled(enabled)
    setReminderType(type)
    setReminderValue(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validation for scheduled mode
    if (timePlanningMode === "scheduled") {
      if (!startTime || !endTime) {
        setError("W trybie zaplanowanej pracy musisz podać czas rozpoczęcia i zakończenia.")
        setLoading(false)
        return
      }

      if (endTime <= startTime) {
        setError("Czas zakończenia musi być późniejszy niż czas rozpoczęcia.")
        setLoading(false)
        return
      }
    }

    try {
      if (isCreateMode) {
        // Create new task
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            projectId: (projectId || selectedProjectId) && (projectId || selectedProjectId) !== "no-project"
              ? (projectId || selectedProjectId)
              : undefined,
            assigneeId: assigneeId || undefined,
            priority: priority || undefined,
            dueDate: dueDate || undefined,
            startTime: startTime ? startTime.toISOString() : undefined,
            endTime: endTime ? endTime.toISOString() : undefined,
            estimatedHours: selectValueToHours(estimatedHours),
            statusId: statusId || undefined,
            reminderEnabled,
            reminderType: reminderEnabled ? reminderType : undefined,
            reminderValue: reminderEnabled ? reminderValue : undefined
          }),
        })

        if (response.ok) {
          const { task: createdTask } = await response.json()

          // Upload attachments if any
          if (attachments.length > 0) {
            await uploadAttachmentsAfterTaskCreation(createdTask.id)
          }

          onTaskCreated?.()
          handleClose()
        } else {
          const data = await response.json()
          setError(data.error || "Nie udało się utworzyć zadania")
        }
      } else if (isEditMode && task) {
        // Update existing task
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            statusId: statusId || undefined,
            assigneeId: assigneeId || undefined,
            priority: priority || undefined,
            dueDate: dueDate || undefined,
            startTime: startTime ? startTime.toISOString() : undefined,
            endTime: endTime ? endTime.toISOString() : undefined,
            estimatedHours: selectValueToHours(estimatedHours),
            projectId: selectedProjectId && selectedProjectId !== "no-project" ? selectedProjectId : undefined,
            reminderEnabled,
            reminderType: reminderEnabled ? reminderType : undefined,
            reminderValue: reminderEnabled ? reminderValue : undefined,
          }),
        })

        if (response.ok) {
          onTaskUpdated?.()
          handleClose()
        } else {
          const data = await response.json()
          setError(data.error || "Nie udało się zaktualizować zadania")
        }
      }
    } catch {
      setError(isCreateMode ? "Failed to create task" : "Wystąpił błąd. Spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    setAttachments([])
    onClose?.()
  }

  // File upload handlers
  const handleFileUpload = async (file: File, description?: string, category?: string) => {
    // For create mode, just store files to upload after task creation
    if (isCreateMode) {
      setAttachments(prev => [...prev, file])
      return
    }

    // For edit mode, upload immediately
    if (task) {
      setUploadingFiles(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        if (description) formData.append('description', description)
        if (category) formData.append('category', category)

        const response = await fetch(`/api/tasks/${task.id}/attachments`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) throw new Error('Upload failed')

        // Refresh task data
        onTaskUpdated?.()
      } catch (error) {
        console.error('File upload error:', error)
        setError('Nie udało się przesłać pliku')
      } finally {
        setUploadingFiles(false)
      }
    }
  }

  const handleFileDelete = async (fileId: string) => {
    if (task) {
      try {
        const response = await fetch(`/api/tasks/${task.id}/attachments?attachmentId=${fileId}`, {
          method: 'DELETE',
        })

        if (!response.ok) throw new Error('Delete failed')

        // Refresh task data
        onTaskUpdated?.()
      } catch (error) {
        console.error('File delete error:', error)
        setError('Nie udało się usunąć pliku')
      }
    }
  }

  const uploadAttachmentsAfterTaskCreation = async (taskId: string) => {
    if (attachments.length === 0) return

    setUploadingFiles(true)
    try {
      for (const file of attachments) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          console.error(`Failed to upload ${file.name}`)
        }
      }
    } catch (error) {
      console.error('Error uploading attachments:', error)
    } finally {
      setUploadingFiles(false)
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    if (!title.trim()) return false

    if (timePlanningMode === "scheduled") {
      if (!startTime || !endTime) return false
      if (endTime <= startTime) return false
    }

    return true
  }

  // Check if there are changes in edit mode
  const hasChanges = isEditMode && task ? (
    title.trim() !== task.title ||
    (description.trim() || undefined) !== task.description ||
    statusId !== task.statusId ||
    (assigneeId || undefined) !== task.assignee?.id ||
    (priority || undefined) !== task.priority ||
    (dueDate || undefined) !== (task.dueDate ? task.dueDate.split('T')[0] : undefined) ||
    (startTime ? startTime.toISOString() : undefined) !== task.startTime ||
    (endTime ? endTime.toISOString() : undefined) !== task.endTime ||
    selectValueToHours(estimatedHours) !== task.estimatedHours
  ) : true

  return (
    <>
      {/* Header Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isCreateMode ? "Utwórz nowe zadanie" : "Edytuj zadanie"}
        </h2>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Tytuł zadania <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Wprowadź tytuł zadania"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Opis</Label>
            <div className="border rounded-md">
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Wprowadź szczegółowy opis zadania..."
              />
            </div>
          </div>

          {/* Project selector */}
          {showProjectSelector && !isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="project" className="text-sm font-medium">
                Projekt
              </Label>
              <select
                id="project"
                value={selectedProjectId || "no-project"}
                onChange={(e) => setSelectedProjectId(e.target.value === "no-project" ? "" : e.target.value)}
                className="h-10 w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="no-project">Brak projektu</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {formatProjectDisplay(project)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assignee selector */}
            <div className="space-y-2">
              <Label htmlFor="assignee" className="text-sm font-medium">
                {(isCreateMode && !projectId && !currentProject) || forceAssignToCurrentUser
                  ? "Przypisany (automatycznie przypisane do Ciebie)"
                  : "Przypisany"
                }
              </Label>
              {(isCreateMode && !projectId && !currentProject) || forceAssignToCurrentUser ? (
                <div className="h-10 px-3 py-2 border border-input bg-muted/50 rounded-md flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {formatAssignee(session?.user).initials}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatAssignee(session?.user).displayName}
                  </span>
                </div>
              ) : (
                <select
                  id="assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="h-10 w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Wybierz osobę</option>
                  {availableTeamMembers.map((member) => {
                    const assigneeInfo = formatAssignee(member)
                    return (
                      <option key={member.id} value={member.id}>
                        {assigneeInfo.displayName}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium">Priorytet</Label>
              <select
                id="priority"
                value={priority || "none"}
                onChange={(e) => setPriority(e.target.value === "none" ? "" : e.target.value)}
                className="h-10 w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="none">Brak priorytetu</option>
                {getPriorityOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Planning Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Sposób planowania czasu</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={timePlanningMode === "reporting" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimePlanningModeChange("reporting")}
                className="flex-1"
              >
                Raportowanie czasu
              </Button>
              <Button
                type="button"
                variant={timePlanningMode === "scheduled" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimePlanningModeChange("scheduled")}
                className="flex-1"
              >
                Zaplanowana praca
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {timePlanningMode === "reporting"
                ? "Ustaw termin wykonania i szacowaną ilość godzin do przepracowania"
                : "Ustaw zakres dat z godzinami - szacowany czas zostanie obliczony automatycznie"
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm font-medium">
                {timePlanningMode === "reporting" ? "Termin wykonania" : "Termin wykonania (opcjonalnie)"}
              </Label>
              <DateTimePicker
                value={dueDate ? new Date(dueDate) : undefined}
                onChange={(date) => setDueDate(date ? dateToLocalDateString(date) : '')}
                className="rounded-lg border shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedHours" className="text-sm font-medium">
                Szacowany czas
                {timePlanningMode === "scheduled" && " (wyliczane)"}
              </Label>
              {timePlanningMode === "reporting" ? (
                <select
                  id="estimatedHours"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="h-10 w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {getEstimatedHoursOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-10 px-3 py-2 border border-input bg-muted/50 rounded-md flex items-center text-sm text-muted-foreground">
                  {estimatedHours && estimatedHours !== "none"
                    ? `${selectValueToHours(estimatedHours)}h`
                    : "Wybierz czas rozpoczęcia i zakończenia"
                  }
                </div>
              )}
            </div>
          </div>

          {/* Time Fields */}
          {timePlanningMode === "scheduled" && (

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-sm font-medium">
                  Czas rozpoczęcia
                  <span className="text-destructive"> *</span>
                </Label>
                <DateTimePicker
                  value={startTime}
                  onChange={setStartTime}
                  placeholder="Wybierz czas rozpoczęcia"
                  className="rounded-lg border shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-sm font-medium">
                  Czas zakończenia
                  <span className="text-destructive"> *</span>
                </Label>
                <DateTimePicker
                  value={endTime}
                  onChange={setEndTime}
                  placeholder="Wybierz czas zakończenia"
                  className="rounded-lg border shadow-sm"
                />
              </div>
            </div>
          )}

          {/* File Attachments */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Załączniki</Label>
            {isCreateMode ? (
              <div className="space-y-2">
                <FileUpload
                  files={attachments.map((file, index) => ({
                    id: `temp-${index}`,
                    filename: file.name,
                    originalName: file.name,
                    url: '',
                    mimeType: file.type,
                    size: file.size,
                    createdAt: new Date().toISOString(),
                    uploadedBy: { id: '', name: '', email: '', avatarUrl: '' }
                  }))}
                  onFileUpload={handleFileUpload}
                  onFileDelete={async (fileId) => {
                    const index = parseInt(fileId.replace('temp-', ''))
                    setAttachments(prev => prev.filter((_, i) => i !== index))
                  }}
                  editable={true}
                  accept="*/*"
                  maxSize={10 * 1024 * 1024} // 10MB
                  maxFiles={10}
                  title="Załączniki"
                  description="Dodaj pliki do zadania (max 10MB każdy)"
                  categories={["specification", "design", "manual", "other"]}
                  showCategories={false}
                  showDescriptions={false}
                  className="border rounded-lg p-4"
                />
                {uploadingFiles && (
                  <div className="text-sm text-muted-foreground">
                    Przesyłanie plików...
                  </div>
                )}
              </div>
            ) : task?.attachments ? (
              <FileUpload
                files={task.attachments}
                onFileUpload={handleFileUpload}
                onFileDelete={handleFileDelete}
                editable={true}
                accept="*/*"
                maxSize={10 * 1024 * 1024} // 10MB
                maxFiles={10}
                title="Załączniki"
                description="Zarządzaj plikami zadania"
                categories={["specification", "design", "manual", "other"]}
                showCategories={true}
                showDescriptions={true}
                className="border rounded-lg p-4"
              />
            ) : (
              <div className="text-sm text-muted-foreground border rounded-lg p-4">
                Brak załączników
              </div>
            )}
          </div>

          {/* Reminder Settings */}
          <ReminderSettings
            reminderEnabled={reminderEnabled}
            reminderType={reminderType}
            reminderValue={reminderValue}
            dueDate={dueDate}
            onReminderChange={handleReminderChange}
          />

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-6">
          <Button type="button" variant="outline" onClick={handleClose} className="h-10">
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={loading || !isFormValid() || (isEditMode && !hasChanges)}
            className="h-10"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {isCreateMode ? "Tworzenie..." : "Aktualizowanie..."}
              </>
            ) : (
              isCreateMode ? "Utwórz zadanie" : "Zaktualizuj zadanie"
            )}
          </Button>
        </div>
      </form>
    </>
  )
}
