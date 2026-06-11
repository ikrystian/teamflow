"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import TextareaAutosize from "react-textarea-autosize"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import type { Task, TaskStatus, Project, Tag } from "@/types"
import { ReminderSettings } from "@/components/tasks/reminder-settings"
import { FileUpload } from "@/components/ui/file-upload"
import { Badge } from "@/components/ui/badge"
import { Send, Plus, Trash2, Clock, Check, GitBranch, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  getEstimatedHoursOptions,
  hoursToSelectValue,
  selectValueToHours,
  getPriorityOptions,
} from "@/lib/task-format-utils"


// Domyślny termin wykonania dla nowych zadań: teraz + 1 dzień + 1 godzina.
function getDefaultDueDate(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(date.getHours() + 1)
  return date
}

interface TaskFormContentProps {
  onTaskCreated?: () => void
  onTaskUpdated?: () => void
  onTaskDeleted?: () => void
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
  onTaskDeleted,
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

  // GitHub branch state
  const [creatingBranch, setCreatingBranch] = useState(false)

  // Build branch URL helper
  const makeBranchUrl = (branchName: string, githubRepo?: string | null) =>
    githubRepo ? `https://github.com/${githubRepo}/tree/${branchName}` : ''

  const [branchCreated, setBranchCreated] = useState<{ name: string; url: string } | null>(
    task?.githubBranchName
      ? { name: task.githubBranchName, url: makeBranchUrl(task.githubBranchName, task.project?.githubRepo) }
      : null
  )

  // Collapsible sections state
  const [showNotes, setShowNotes] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"

  // Auto-save state (edit mode only)
  const [isSaving, setIsSaving] = useState(false)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Latest onTaskUpdated callback, accessed via ref so autoSave stays stable
  // even when the parent passes a new (non-memoized) callback each render.
  const onTaskUpdatedRef = useRef(onTaskUpdated)
  onTaskUpdatedRef.current = onTaskUpdated
  // Snapshot of the last loaded/saved field values, used to avoid spurious saves.
  const lastSavedSnapshotRef = useRef<string | null>(null)
  // True right after the form is (re)populated from a task, so the first
  // snapshot run just captures the baseline instead of triggering a save.
  const justLoadedRef = useRef(true)

  // Full list of projects for the project selector. Falls back to fetching when
  // the parent doesn't pass a list (e.g. opened from a single-project board).
  const [projectsList, setProjectsList] = useState<Array<{ id: string; name: string }>>(projects)

  // Time entries reported directly on the task (edit mode)
  const [timeEntries, setTimeEntries] = useState<Array<{ id: string; hours: number; description?: string | null; date: string; user?: { id: string; name?: string | null } }>>([])
  const [newTimeHours, setNewTimeHours] = useState("")
  const [loggingTime, setLoggingTime] = useState(false)
  // Toggles the compact time-reporting panel revealed by the time summary button.
  const [showTimeReporting, setShowTimeReporting] = useState(false)

  // When the "changes" note was last sent to Slack (null = not sent yet).
  const [slackSentAt, setSlackSentAt] = useState<string | null>(task?.changesSentAt ?? null)
  const [slackScheduledSendAt, setSlackScheduledSendAt] = useState<Date | undefined>(
    task?.changesScheduledSendAt ? new Date(task.changesScheduledSendAt) : undefined
  )
  const [serverTime, setServerTime] = useState<Date>(new Date())


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

  // Fetch the full list of projects for the selector (when not provided by parent)
  const fetchProjectsList = useCallback(async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjectsList(
          (data.projects || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
        )
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }, [])

  // Fetch time entries reported on the task (edit mode)
  const fetchTimeEntries = useCallback(async (tid: string) => {
    try {
      const response = await fetch(`/api/tasks/${tid}/time-entries`)
      if (response.ok) {
        const data = await response.json()
        setTimeEntries(data.timeEntries || [])
      }
    } catch (error) {
      console.error("Error fetching time entries:", error)
    }
  }, [])

  // Keep projectsList in sync with the prop, and fetch once when it's empty.
  // Depend on the length (a primitive) so a fresh `[]` default each render
  // doesn't retrigger this effect into a fetch loop.
  const projectsFetchedRef = useRef(false)
  useEffect(() => {
    if (projects.length > 0) {
      setProjectsList(projects)
    } else if (!projectsFetchedRef.current) {
      projectsFetchedRef.current = true
      fetchProjectsList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length, fetchProjectsList])

  // Load time entries when editing a task.
  useEffect(() => {
    if (isEditMode && task?.id) {
      fetchTimeEntries(task.id)
    }
  }, [isEditMode, task?.id, fetchTimeEntries])

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
      setDueDate(defaultDate ?? getDefaultDueDate())
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
      setSlackSentAt(task.changesSentAt ?? null)
      setSlackScheduledSendAt(task.changesScheduledSendAt ? new Date(task.changesScheduledSendAt) : undefined)
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
      // Reset branch state when switching tasks
      setBranchCreated(
        task.githubBranchName
          ? { name: task.githubBranchName, url: makeBranchUrl(task.githubBranchName, task.project?.githubRepo) }
          : null
      )

      // Mark as freshly loaded so the auto-save watcher captures this as the
      // baseline instead of immediately PATCHing it back to the server.
      justLoadedRef.current = true
    }
    // Only re-run when switching to a different task (by id) or mode — not on
    // every new `task` object reference, which would wipe in-progress edits and
    // cause an auto-save feedback loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateMode, isEditMode, task?.id, projectId, session?.user?.id, fetchTaskStatuses, fetchTags, defaultDate, defaultStartTime, defaultEndTime])

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

  // Serialized snapshot of the auto-saved fields. Recomputed every render so the
  // watcher effect below can compare content (not object identity) and only save
  // when the user actually changed something.
  const autoSaveSnapshot = JSON.stringify({
    title: title.trim(),
    description: description.trim(),
    changes: changes.trim(),
    statusId,
    assigneeId,
    priority,
    dueDate: dueDate ? dueDate.toISOString() : null,
    startTime: startTime ? startTime.toISOString() : null,
    endTime: endTime ? endTime.toISOString() : null,
    estimatedHours,
    selectedProjectId,
    reminderEnabled,
    reminderType,
    reminderValue,
    tagIds: [...selectedTagIds].sort(),
  })

  // Keep the latest values reachable from the (stable) autoSave closure.
  const formStateRef = useRef<Record<string, unknown>>({})
  formStateRef.current = {
    title, description, changes, statusId, assigneeId, priority,
    dueDate, startTime, endTime, estimatedHours, selectedProjectId,
    reminderEnabled, reminderType, reminderValue, selectedTagIds,
  }

  // Stable auto-save: reads current values from a ref so its identity never
  // changes, which prevents the watcher effect from re-firing in a loop.
  const autoSave = useCallback(async (snapshotAtCall: string) => {
    if (!isEditMode || !task) return
    const v = formStateRef.current as {
      title: string; description: string; changes: string; statusId: string;
      assigneeId: string; priority: string; dueDate?: Date; startTime?: Date;
      endTime?: Date; estimatedHours: string; selectedProjectId: string;
      reminderEnabled: boolean; reminderType: string; reminderValue: number;
      selectedTagIds: string[];
    }

    try {
      setIsSaving(true)
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: v.title.trim(),
          description: v.description.trim() || undefined,
          changes: v.changes.trim() || undefined,
          statusId: v.statusId || undefined,
          assigneeId: v.assigneeId || undefined,
          priority: v.priority || undefined,
          dueDate: v.dueDate ? v.dueDate.toISOString() : undefined,
          startTime: v.startTime ? v.startTime.toISOString() : undefined,
          endTime: v.endTime ? v.endTime.toISOString() : undefined,
          estimatedHours: selectValueToHours(v.estimatedHours),
          projectId: v.selectedProjectId && v.selectedProjectId !== "no-project" ? v.selectedProjectId : undefined,
          reminderEnabled: v.reminderEnabled,
          reminderType: v.reminderEnabled ? v.reminderType : undefined,
          reminderValue: v.reminderEnabled ? v.reminderValue : undefined,
          tagIds: v.selectedTagIds,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        console.error("Auto-save error:", data.error)
      } else {
        // Remember what we just persisted so the refetch below doesn't bounce.
        lastSavedSnapshotRef.current = snapshotAtCall
        onTaskUpdatedRef.current?.()
      }
    } catch (error) {
      console.error("Auto-save error:", error)
    } finally {
      setIsSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, task?.id])

  // Watch the content snapshot and debounce a save when it changes in edit mode.
  useEffect(() => {
    if (!isEditMode) return

    // First run after (re)loading a task: capture the baseline, don't save.
    if (justLoadedRef.current) {
      justLoadedRef.current = false
      lastSavedSnapshotRef.current = autoSaveSnapshot
      return
    }

    // Nothing actually changed since the last load/save.
    if (autoSaveSnapshot === lastSavedSnapshotRef.current) return

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave(autoSaveSnapshot)
    }, 800)

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
    }
  }, [autoSaveSnapshot, isEditMode, autoSave])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // Update server time every second when Slack send is scheduled
  useEffect(() => {
    if (!slackScheduledSendAt || slackSentAt) return

    const interval = setInterval(() => {
      setServerTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [slackScheduledSendAt, slackSentAt])

  // Log a new time entry directly on the task (edit mode).
  const handleAddTimeEntry = async () => {
    if (!task) return
    const hours = parseFloat(newTimeHours)
    if (!hours || hours <= 0) {
      toast.error("Podaj liczbę godzin większą od zera")
      return
    }
    setLoggingTime(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      })
      if (response.ok) {
        setNewTimeHours("")
        await fetchTimeEntries(task.id)
        onTaskUpdated?.()
        toast.success("Zaraportowano czas")
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się zaraportować czasu")
      }
    } catch (error) {
      console.error("Error logging time:", error)
      toast.error("Nie udało się zaraportować czasu")
    } finally {
      setLoggingTime(false)
    }
  }

  const handleDeleteTimeEntry = async (entryId: string) => {
    if (!task) return
    try {
      const response = await fetch(`/api/tasks/${task.id}/time-entries?entryId=${entryId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        await fetchTimeEntries(task.id)
        onTaskUpdated?.()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się usunąć wpisu")
      }
    } catch (error) {
      console.error("Error deleting time entry:", error)
      toast.error("Nie udało się usunąć wpisu")
    }
  }

  // Reported time = direct task time entries + time logged on subtasks.
  const taskReportedHours = timeEntries.reduce((sum, e) => sum + e.hours, 0)
  const subtaskReportedHours = subtasks.reduce((sum, s) => sum + (s.timeSpent || 0), 0)
  const totalReportedHours = taskReportedHours + subtaskReportedHours
  const plannedHours = selectValueToHours(estimatedHours) || 0

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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteTask = async () => {
    if (!task) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" })
      if (response.ok) {
        toast.success("Zadanie zostało usunięte")
        onTaskDeleted?.()
        handleClose()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się usunąć zadania")
      }
    } catch {
      toast.error("Wystąpił błąd podczas usuwania zadania")
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Create a GitHub branch for this task.
  const handleCreateGithubBranch = async () => {
    if (!task) return
    setCreatingBranch(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/github-branch`, {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok) {
        const branchUrl = data.url || makeBranchUrl(data.branchName, task.project?.githubRepo)
        setBranchCreated({ name: data.branchName, url: branchUrl })
        toast.success(`Branch "${data.branchName}" został utworzony`)
        // Automatically open the branch in a new tab
        if (branchUrl) window.open(branchUrl, '_blank', 'noopener,noreferrer')
        onTaskUpdated?.()
      } else {
        toast.error(data.error || 'Nie udało się utworzyć brancha')
      }
    } catch (error) {
      console.error('Error creating branch:', error)
      toast.error('Nie udało się utworzyć brancha')
    } finally {
      setCreatingBranch(false)
    }
  }

  // Send the AI-generated "changes" to the project's Slack channel.
  const handleSendToSlack = async (scheduledTime?: Date) => {
    if (!task || !changes.trim()) {
      toast.error("Nie możesz wysłać pustych notatek")
      return
    }
    setSendingToSlack(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/slack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledFor: scheduledTime ? scheduledTime.toISOString() : undefined,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        if (data.scheduled) {
          setSlackScheduledSendAt(scheduledTime)
          toast.success(`Zaplanowano wysyłkę na ${scheduledTime?.toLocaleString("pl-PL")}`)
        } else {
          setSlackSentAt(data.changesSentAt ?? new Date().toISOString())
          toast.success("Wysłano na Slacka")
        }
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
      <form onSubmit={handleSubmit} className="space-y-6 modal-form">
        <div className="space-y-4">
          {/* Header Row with Status, Assignee, Priority, Project */}
          {isEditMode && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 p-0 bg-muted/30 rounded-lg">
              {/* Status */}
              <div className="space-y-1">
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className="h-8 w-full px-2 py-1 border border-1  bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Status</option>
                  {taskStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div className="space-y-1">
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="h-8 w-full px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Osoba</option>
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
                <select
                  value={priority || "none"}
                  onChange={(e) => setPriority(e.target.value === "none" ? "" : e.target.value)}
                  className="h-8 w-full px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="none">Priorytet</option>
                  {getPriorityOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div className="space-y-1">
                <select
                  value={selectedProjectId || "no-project"}
                  onChange={(e) => setSelectedProjectId(e.target.value === "no-project" ? "" : e.target.value)}
                  className="h-8 w-full px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="no-project">Projekt</option>
                  {projectsList.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              {isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTimeReporting((v) => !v)}
                  className="gap-1.5"
                  title="Zaraportowany / planowany czas"
                >
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {Number.isInteger(totalReportedHours) ? totalReportedHours : totalReportedHours.toFixed(1)}
                    /{Number.isInteger(plannedHours) ? plannedHours : plannedHours.toFixed(1)}h
                  </span>
                </Button>
              )}

            </div>
          )}



          {/* Time summary button — reported / planned hours, toggles quick add */}
          {isEditMode && (
            <div className="space-y-2">


              {showTimeReporting && (
                <div>
                  {/* Existing entries (task-level time) */}
                  {timeEntries.length > 0 && (
                    <div className="space-y-1">
                      {timeEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-2 text-sm p-2 bg-background rounded-md">
                          <span className="font-medium w-14 shrink-0">{entry.hours}h</span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                            {new Date(entry.date).toLocaleDateString("pl-PL")}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTimeEntry(entry.id)}
                            className="text-destructive hover:text-destructive/80 shrink-0"
                            title="Usuń wpis"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick add (hours only, no description) */}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Godz."
                      value={newTimeHours}
                      onChange={(e) => setNewTimeHours(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddTimeEntry()
                        }
                      }}
                      className="h-9 w-28 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTimeEntry}
                      disabled={loggingTime}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Raportuj czas
                    </Button>
                  </div>
                  {subtaskReportedHours > 0 && (
                    <p className="text-xs text-muted-foreground">
                      W tym z podzadań: {subtaskReportedHours}h · bezpośrednio: {taskReportedHours}h
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="flex items-start gap-2 w-full">
            {isEditMode && task?.key && (
              <span className="inline-block text-xs font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded select-all shrink-0 mt-1.5">
                {task.key}
              </span>
            )}
            <TextareaAutosize
              id="title"
              placeholder="Tytuł zadania"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minRows={1}
              className="flex-1 w-full resize-none p-0 px-1 font-medium text-xl border-none bg-transparent outline-none hover:text-primary focus:border-none focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <div className="rounded-md">
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotes(!showNotes)}
                  className="flex-1 justify-start"
                >
                  {showNotes ? "▼" : "▶"} Notatki ze zmian
                </Button>
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <DateTimePicker
                        value={slackScheduledSendAt}
                        onChange={setSlackScheduledSendAt}
                      />
                      {slackScheduledSendAt && !slackSentAt && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Zaplanowano na {slackScheduledSendAt.toLocaleString("pl-PL")}
                          </p>

                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSlackScheduledSendAt(undefined)
                      }}
                      disabled={!slackScheduledSendAt}
                    >
                      Wyczyść
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSendToSlack(slackScheduledSendAt)}
                      disabled={sendingToSlack || !changes.trim()}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {sendingToSlack ? "Wysyłanie..." : "Wyślij na Slack"}
                    </Button>
                  </div>
                  {slackSentAt && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Wysłano {new Date(slackSentAt).toLocaleDateString("pl-PL")}
                    </p>
                  )}
                  {slackScheduledSendAt && !slackSentAt && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">

                      <p className="text-blue-500 dark:text-blue-300 flex items-center gap-1">
                        Obecny czas: {serverTime.toLocaleString("pl-PL")}
                      </p>
                    </div>
                  )}
                </div>

              </div>
              {showNotes && (
                <div className="space-y-3 p-3 border rounded-md bg-muted/20">
                  <TextareaAutosize
                    id="changes"
                    value={changes}
                    onChange={(e) => {
                      setChanges(e.target.value)
                      if (slackSentAt) setSlackSentAt(null)
                      if (slackScheduledSendAt) setSlackScheduledSendAt(undefined)
                    }}
                    placeholder="Notatki dotyczące zmian (będą wysłane na Slack w formacie markdown)"
                    minRows={4}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono resize-none"
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
                  ) : (
                    <FileUpload
                      files={task?.attachments || []}
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
                  disablePast={isCreateMode}
                  defaultTimeOnSelect={isCreateMode}
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
                    disablePast={isCreateMode}
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
                    disablePast={isCreateMode}
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
          {/* Delete task — edit mode only */}
          {isEditMode && task && (
            <div className="sm:mr-auto">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="text-sm text-destructive">Na pewno usunąć?</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteTask}
                    disabled={deleting}
                    className="h-7"
                  >
                    {deleting ? "Usuwanie..." : "Tak"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="h-7"
                  >
                    Anuluj
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń zadanie
                </Button>
              )}
            </div>
          )}
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

          {/* GitHub branch button — edit mode only */}
          {isEditMode && task && (
            <div className="flex items-center gap-2">
              {branchCreated ? (
                <a
                  href={branchCreated.url || makeBranchUrl(branchCreated.name, task?.project?.githubRepo) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Otwórz branch ${branchCreated.name} na GitHub`}
                  className="inline-flex items-center gap-1.5 text-sm font-mono px-3 py-2 rounded-md border bg-muted/50 hover:bg-muted transition-colors"
                >
                  <GitBranch className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 dark:text-green-400 max-w-[200px] truncate">{branchCreated.name}</span>
                </a>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateGithubBranch}
                  disabled={creatingBranch}
                  className="gap-2"
                >
                  <GitBranch className="h-4 w-4" />
                  {creatingBranch ? "Tworzenie brancha..." : "Utwórz branch GitHub"}
                </Button>
              )}
            </div>
          )}
        </div>
      </form>
    </>
  )
}
