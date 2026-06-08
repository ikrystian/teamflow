"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"

import { DateTimePicker } from "@/components/ui/datetime-picker"
import type { Task, TaskStatus, Project, Tag } from "@/types"
import { ReminderSettings } from "@/components/tasks/reminder-settings"
import { FileUpload } from "@/components/ui/file-upload"
import { Badge } from "@/components/ui/badge"
import { Send } from "lucide-react"
import { toast } from "sonner"
import {
  getEstimatedHoursOptions,
  hoursToSelectValue,
  selectValueToHours,
  formatAssignee,
  getPriorityOptions,
} from "@/lib/task-format-utils"


interface TaskFormContentProps {
  onTaskCreated?: () => void
  onTaskUpdated?: () => void
  onClose?: () => void

  // For create mode
  projects?: Project[]
  projectId?: string
  defaultStatusId?: string
  forceAssignToCurrentUser?: boolean
  defaultDate?: Date
  defaultStartTime?: Date
  defaultEndTime?: Date

  // For edit mode
  task?: Task | null

  // Mode determination
  mode: "create" | "edit"

}

export function TaskFormContent({
  onTaskCreated,
  onTaskUpdated,
  onClose,
  projects = [],
  projectId,
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
  const [changes, setChanges] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [statusId, setStatusId] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [priority, setPriority] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>()
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
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // File upload state
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  // Tags state
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Subtasks state
  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; isCompleted: boolean; timeSpent?: number; isNew?: boolean }>>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")

  // People with access to the project (project creator + members), used for the assignee select
  const [projectMembers, setProjectMembers] = useState<
    Array<{ id: string; name: string | null; email: string; avatarUrl?: string | null }>
  >([])

  // Slack send state (for the AI-generated "changes" field)
  const [sendingToSlack, setSendingToSlack] = useState(false)

  // Collapsible sections state
  const [showNotes, setShowNotes] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"

  // Auto-save state (edit mode only)
  const [isSaving, setIsSaving] = useState(false)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get current project for member selection
  const currentProject = projects.find(p => p.id === (projectId || selectedProjectId));


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

  // Fetch available tags
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setAvailableTags(data.tags)
      }
    } catch (error) {
      console.error("Error fetching tags:", error)
    }
  }, [])

  // Fetch everyone with access to the project (creator + members) for the assignee select
  const fetchProjectMembers = useCallback(async (pid: string) => {
    try {
      const response = await fetch(`/api/projects/${pid}`)
      if (response.ok) {
        const { project } = await response.json()
        const people: Array<{ id: string; name: string | null; email: string; avatarUrl?: string | null }> = []
        const addPerson = (user?: { id: string; name?: string | null; email: string; avatarUrl?: string | null } | null) => {
          if (user && !people.some(p => p.id === user.id)) {
            people.push({ id: user.id, name: user.name ?? null, email: user.email, avatarUrl: user.avatarUrl })
          }
        }
        addPerson(project?.createdBy)
        project?.members?.forEach((member: { user: { id: string; name?: string | null; email: string; avatarUrl?: string | null } }) => addPerson(member.user))
        setProjectMembers(people)
      }
    } catch (error) {
      console.error("Error fetching project members:", error)
    }
  }, [])

  // Initialize form
  useEffect(() => {
    fetchTaskStatuses()
    fetchTags()

    if (isCreateMode) {
      // Reset form for create mode
      setTitle("")
      setDescription("")
      setSelectedProjectId(projectId || "")
      setAssigneeId(session?.user?.id || "")
      setPriority("")
      setDueDate(defaultDate)
      setStartTime(defaultStartTime || undefined)
      setEndTime(defaultEndTime || undefined)
      setEstimatedHours("")
      setTimePlanningMode(defaultStartTime && defaultEndTime ? "scheduled" : "reporting")
      setReminderEnabled(false)
      setReminderType("hours")
      setReminderValue(1)
      setSelectedTagIds([])
      setError("")
    } else if (isEditMode && task) {
      // Populate form for edit mode
      setTitle(task.title)
      setDescription(task.description || "")
      setChanges(task.changes || "")
      setSelectedProjectId(task.project?.id || "")
      setAssigneeId(task.assignee?.id || "")
      setPriority(task.priority || "")
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
      setStartTime(task.startTime ? new Date(task.startTime) : undefined)
      setEndTime(task.endTime ? new Date(task.endTime) : undefined)
      setEstimatedHours(hoursToSelectValue(task.estimatedHours))

      // Determine time planning mode based on existing data
      const hasScheduledTime = task.startTime && task.endTime
      setTimePlanningMode(hasScheduledTime ? "scheduled" : "reporting")

      setReminderEnabled(task.reminderEnabled || false)
      setReminderType(task.reminderType || "hours")
      setReminderValue(task.reminderValue || 1)
      setSelectedTagIds(task.tags?.map(t => t.id) || [])
      setSubtasks(task.subtasks || [])
      setError("")
    }
  }, [isCreateMode, isEditMode, task, projectId, session?.user?.id, fetchTaskStatuses, fetchTags, defaultDate, defaultStartTime, defaultEndTime])

  // Force assign to current user when forceAssignToCurrentUser is true
  useEffect(() => {
    if (forceAssignToCurrentUser && isCreateMode && session?.user?.id) {
      setAssigneeId(session.user.id)
    }
  }, [forceAssignToCurrentUser, isCreateMode, session?.user?.id, selectedProjectId])

  // Load people with access whenever the selected project changes
  const effectiveProjectId = projectId || selectedProjectId
  useEffect(() => {
    if (effectiveProjectId && effectiveProjectId !== "no-project") {
      fetchProjectMembers(effectiveProjectId)
    } else {
      setProjectMembers([])
    }
  }, [effectiveProjectId, fetchProjectMembers])

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
      setDueDate(startTime)
    }
  }, [startTime, timePlanningMode, dueDate])

  const handleReminderChange = (enabled: boolean, type: string, value: number) => {
    setReminderEnabled(enabled)
    setReminderType(type)
    setReminderValue(value)
  }

  // Auto-save function for edit mode
  const autoSave = useCallback(async () => {
    if (!isEditMode || !task) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          changes: changes.trim() || undefined,
          statusId: statusId || undefined,
          assigneeId: assigneeId || undefined,
          priority: priority || undefined,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          startTime: startTime ? startTime.toISOString() : undefined,
          endTime: endTime ? endTime.toISOString() : undefined,
          estimatedHours: selectValueToHours(estimatedHours),
          projectId: selectedProjectId && selectedProjectId !== "no-project" ? selectedProjectId : undefined,
          reminderEnabled,
          reminderType: reminderEnabled ? reminderType : undefined,
          reminderValue: reminderEnabled ? reminderValue : undefined,
          tagIds: selectedTagIds,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        console.error("Auto-save error:", data.error)
      } else {
        onTaskUpdated?.()
      }
    } catch (error) {
      console.error("Auto-save error:", error)
    } finally {
      setIsSaving(false)
    }
  }, [isEditMode, task, title, description, changes, statusId, assigneeId, priority, dueDate, startTime, endTime, estimatedHours, selectedProjectId, reminderEnabled, reminderType, reminderValue, selectedTagIds, onTaskUpdated])

  // Debounced auto-save for field changes
  const debouncedAutoSave = useCallback(() => {
    if (!isEditMode) return

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 500)
  }, [isEditMode, autoSave])

  // Auto-save on field changes in edit mode
  useEffect(() => {
    debouncedAutoSave()
  }, [isEditMode ? title : null, isEditMode ? description : null, isEditMode ? statusId : null, isEditMode ? assigneeId : null, isEditMode ? priority : null, isEditMode ? dueDate : null, isEditMode ? selectedProjectId : null, debouncedAutoSave])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

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
            dueDate: dueDate ? dueDate.toISOString() : undefined,
            startTime: startTime ? startTime.toISOString() : undefined,
            endTime: endTime ? endTime.toISOString() : undefined,
            estimatedHours: selectValueToHours(estimatedHours),
            statusId: statusId || undefined,
            reminderEnabled,
            reminderType: reminderEnabled ? reminderType : undefined,
            reminderValue: reminderEnabled ? reminderValue : undefined,
            tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined
          }),
        })

        if (response.ok) {
          const { task: createdTask } = await response.json()

          // Upload attachments if any
          if (attachments.length > 0) {
            await uploadAttachmentsAfterTaskCreation(createdTask.id)
          }

          window.dispatchEvent(new CustomEvent('task-created'))
          onTaskCreated?.()
          handleClose()
        } else {
          const data = await response.json()
          setError(data.error || "Nie udało się utworzyć zadania")
        }
      } else if (isEditMode && task) {
        // Update existing task
        // Separate new and existing subtasks
        const subtasksToCreate = subtasks.filter(s => s.isNew || s.id.startsWith('temp-')).map(s => ({
          title: s.title,
          timeSpent: s.timeSpent || null,
        }))
        const subtasksToUpdate = subtasks.filter(s => !s.isNew && !s.id.startsWith('temp-')).map(s => ({
          id: s.id,
          title: s.title,
          isCompleted: s.isCompleted,
          timeSpent: s.timeSpent || null,
        }))
        const deletedSubtaskIds = (task.subtasks || [])
          .filter(original => !subtasks.some(current => current.id === original.id))
          .map(s => s.id)

        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            changes: changes.trim() || undefined,
            statusId: statusId || undefined,
            assigneeId: assigneeId || undefined,
            priority: priority || undefined,
            dueDate: dueDate ? dueDate.toISOString() : undefined,
            startTime: startTime ? startTime.toISOString() : undefined,
            endTime: endTime ? endTime.toISOString() : undefined,
            estimatedHours: selectValueToHours(estimatedHours),
            projectId: selectedProjectId && selectedProjectId !== "no-project" ? selectedProjectId : undefined,
            reminderEnabled,
            reminderType: reminderEnabled ? reminderType : undefined,
            reminderValue: reminderEnabled ? reminderValue : undefined,
            tagIds: selectedTagIds,
            subtasksToCreate: subtasksToCreate.length > 0 ? subtasksToCreate : undefined,
            subtasksToUpdate: subtasksToUpdate.length > 0 ? subtasksToUpdate : undefined,
            deletedSubtaskIds: deletedSubtaskIds.length > 0 ? deletedSubtaskIds : undefined,
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

  // Send the AI-generated "changes" to the project's Slack channel.
  const handleSendToSlack = async () => {
    if (!task) return
    setSendingToSlack(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/slack`, {
        method: "POST",
      })
      const data = await response.json()
      if (response.ok) {
        toast.success("Wysłano na Slacka")
      } else {
        toast.error(data.error || "Nie udało się wysłać na Slacka")
      }
    } catch (error) {
      console.error("Error sending to Slack:", error)
      toast.error("Nie udało się wysłać na Slacka")
    } finally {
      setSendingToSlack(false)
    }
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
  const hasSubtaskChanges = subtasks.length !== (task?.subtasks?.length || 0) ||
    subtasks.some((s, i) => {
      const original = task?.subtasks?.[i]
      return !original || s.title !== original.title || s.isCompleted !== original.isCompleted || (s.timeSpent || 0) !== (original.timeSpent || 0)
    })

  const hasChanges = isEditMode && task ? (
    title.trim() !== task.title ||
    (description.trim() || undefined) !== task.description ||
    (changes.trim() || undefined) !== task.changes ||
    statusId !== task.statusId ||
    (assigneeId || undefined) !== task.assignee?.id ||
    (priority || undefined) !== task.priority ||
    (dueDate ? dueDate.toISOString() : undefined) !== task.dueDate ||
    (startTime ? startTime.toISOString() : undefined) !== task.startTime ||
    (endTime ? endTime.toISOString() : undefined) !== task.endTime ||
    selectValueToHours(estimatedHours) !== task.estimatedHours ||
    hasSubtaskChanges
  ) : true

  // People available in the assignee select. Make sure the current user is always
  // selectable so the default assignment (the task creator) shows up.
  const assigneeOptions = session?.user?.id && !projectMembers.some(m => m.id === session.user.id)
    ? [
        {
          id: session.user.id,
          name: session.user.name ?? null,
          email: session.user.email ?? "",
          avatarUrl: session.user.image ?? null,
        },
        ...projectMembers,
      ]
    : projectMembers

  return (
    <>
      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6 modal-form h-full flex flex-col">
        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Header Row with Status, Assignee, Priority, Project */}
          {isEditMode && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-0 bg-muted/30 rounded-lg">
              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className="h-8 w-full px-2 py-1 border border-input bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Brak</option>
                  {taskStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Osoba</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="h-8 w-full px-2 py-1 border border-input bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Brak</option>
                  {assigneeOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email}
                      {member.id === session?.user?.id ? " (Ty)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Priorytet</label>
                <select
                  value={priority || "none"}
                  onChange={(e) => setPriority(e.target.value === "none" ? "" : e.target.value)}
                  className="h-8 w-full px-2 py-1 border border-input bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="none">Brak</option>
                  {getPriorityOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Projekt</label>
                <select
                  value={selectedProjectId || "no-project"}
                  onChange={(e) => setSelectedProjectId(e.target.value === "no-project" ? "" : e.target.value)}
                  className="h-8 w-full px-2 py-1 border border-input bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="no-project">Bez projektu</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Time Info Row */}
          {isEditMode && subtasks.some(s => s.timeSpent) && (
            <div className="p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
              <span>⏱️ Zaraportowany czas: {subtasks.reduce((sum, s) => sum + (s.timeSpent || 0), 0).toFixed(1)}h</span>
              {estimatedHours && estimatedHours !== "none" && (
                <span className="ml-4">| Szacowany czas: {selectValueToHours(estimatedHours)}h</span>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Input
              id="title"
              placeholder="Tytuł zadania"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="p-0 font-medium text-xl px-3 border-none cursor-pointer hover:text-primary focus:border-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Opis</Label>
            <div className="border rounded-md">
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Wprowadź szczegółowy opis zadania..."
                showToolbarOnFocus={true}
              />
            </div>
          </div>

          {/* Changes field - collapsible in edit mode with Slack sending option */}
          {isEditMode && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
                className="w-full justify-start"
              >
                {showNotes ? "▼" : "▶"} Pokaż notatki ze zmian
              </Button>

              {showNotes && (
                <div className="space-y-2 p-3 border rounded-md bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="changes" className="text-sm font-medium">Notatki (do wysłania na Slack)</Label>
                    {task?.changes && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSendToSlack}
                        disabled={sendingToSlack}
                        title="Wyślij notatki na Slacka"
                      >
                        <Send className="h-4 w-4" />
                        <span className="ml-1 text-xs">{sendingToSlack ? "Wysyłanie..." : "Wyślij"}</span>
                      </Button>
                    )}
                  </div>
                  <textarea
                    id="changes"
                    value={changes}
                    onChange={(e) => setChanges(e.target.value)}
                    placeholder="Notatki dotyczące zmian (będą wysłane na Slack w formacie markdown)"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono min-h-[100px] resize-vertical"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">

            {/* Tags Selection */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tagi</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[42px]">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id)
                    return (
                      <Badge
                        key={tag.id}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        style={isSelected ? {
                          backgroundColor: tag.color,
                          borderColor: tag.color,
                          color: '#fff'
                        } : {
                          borderColor: tag.color,
                          color: tag.color
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTagIds(prev => prev.filter(id => id !== tag.id))
                          } else {
                            setSelectedTagIds(prev => [...prev, tag.id])
                          }
                        }}
                      >
                        {tag.name}
                      </Badge>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Kliknij na tag, aby go zaznaczyć lub odznaczyć
                </p>
              </div>
            )}

            {/* Advanced Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-start mt-2"
            >
              {showAdvanced ? "▼" : "▶"} Zaawansowane
            </Button>

            {/* Advanced Section */}
            {showAdvanced && (
              <div className="space-y-4 p-3 border rounded-md bg-muted/20">
                {/* Subtasks Management */}
                {isEditMode && (
                  <div className="space-y-3 border rounded-lg p-4 bg-background">

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Podzadania</Label>
                    <span className="text-xs text-muted-foreground">
                      {subtasks.filter(s => s.isCompleted).length}/{subtasks.length} ukończone
                    </span>
                  </div>
                  {subtasks.length > 0 && subtasks.some(s => s.timeSpent) && (
                    <div className="text-xs text-muted-foreground">
                      Zaraportowany czas: {subtasks.reduce((sum, s) => sum + (s.timeSpent || 0), 0)}h
                    </div>
                  )}
                </div>

                {/* Existing subtasks */}
                {subtasks.length > 0 && (
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 p-2 bg-background border rounded-md">
                        <input
                          type="checkbox"
                          checked={subtask.isCompleted}
                          onChange={(e) => {
                            setSubtasks(prev => prev.map(s =>
                              s.id === subtask.id ? { ...s, isCompleted: e.target.checked } : s
                            ))
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={subtask.title}
                          onChange={(e) => {
                            setSubtasks(prev => prev.map(s =>
                              s.id === subtask.id ? { ...s, title: e.target.value } : s
                            ))
                          }}
                          className="flex-1 px-2 py-1 text-sm border-0 bg-transparent focus:outline-none"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={subtask.timeSpent || ""}
                          onChange={(e) => {
                            setSubtasks(prev => prev.map(s =>
                              s.id === subtask.id ? { ...s, timeSpent: e.target.value ? parseFloat(e.target.value) : 0 } : s
                            ))
                          }}
                          className="w-16 px-2 py-1 text-sm border-0 bg-transparent focus:outline-none text-right"
                          placeholder="h"
                          title="Zaraportowany czas w godzinach"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSubtasks(prev => prev.filter(s => s.id !== subtask.id))
                          }}
                          className="text-xs text-destructive hover:text-destructive/80 px-2"
                        >
                          Usuń
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new subtask */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Dodaj nowe podzadanie..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                        setSubtasks(prev => [...prev, {
                          id: `temp-${Date.now()}`,
                          title: newSubtaskTitle.trim(),
                          isCompleted: false,
                          isNew: true
                        }])
                        setNewSubtaskTitle("")
                      }
                    }}
                    className="h-9 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newSubtaskTitle.trim()) {
                        setSubtasks(prev => [...prev, {
                          id: `temp-${Date.now()}`,
                          title: newSubtaskTitle.trim(),
                          isCompleted: false,
                          isNew: true
                        }])
                        setNewSubtaskTitle("")
                      }
                    }}
                  >
                    Dodaj
                  </Button>
                </div>
                  </div>
                )}

                {/* File Attachments */}
                <div className="space-y-3 border-t pt-4">
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
                        maxSize={10 * 1024 * 1024}
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
                      maxSize={10 * 1024 * 1024}
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
              </div>
            )}

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
                  value={dueDate}
                  onChange={setDueDate}
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
          </div>




          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-6">
          <Button
            type="submit"
            disabled={loading || !isFormValid() || isSaving}
            className="h-10"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {isCreateMode ? "Tworzenie..." : "Aktualizowanie..."}
              </>
            ) : isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                "Zapisywanie..."
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
