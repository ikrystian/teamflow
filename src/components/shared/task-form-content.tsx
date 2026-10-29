"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "@/lib/auth/use-session"
import type { AppSession as Session } from "@/lib/auth/types"
import TextareaAutosize from "react-textarea-autosize"
import { Button, buttonVariants } from "@/components/ui/button"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import type { Task, TaskStatus, Project, Tag, TaskAttachment } from "@/types"
import { ReminderSettings } from "@/components/tasks/reminder-settings"
import { TaskComments } from "@/components/tasks/task-comments"
import { FileUpload } from "@/components/ui/file-upload"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  Check,
  ChevronRight,
  CircleDot,
  Clock,
  Copy,
  Eye,
  Flag,
  FolderKanban,
  GitBranch,
  Hourglass,
  ListChecks,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Send,
  Tags,
  Timer,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Meter,
  NativeSelect,
  PropertyRow,
  SaveIndicator,
  SectionHeader,
  Segmented,
  SubtaskList,
  TagPicker,
  TimeReport,
  type SubtaskDraft,
} from "@/components/tasks/task-form-parts"
import {
  getEstimatedHoursOptions,
  hoursToSelectValue,
  selectValueToHours,
  getPriorityOptions,
} from "@/lib/task-format-utils"
import { softDeleteTaskWithUndo } from "@/lib/task-delete"


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

  // When true the form is shown read-only (view only — no edits/saves).
  readOnly?: boolean

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
  readOnly = false,
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
  // Existing attachments shown in edit mode. Seeded from the task prop but kept
  // in local state so a freshly uploaded / deleted file shows up immediately —
  // the parent passes a stale task snapshot that isn't refreshed after upload.
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>(task?.attachments || [])

  // Tags state
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Subtasks state
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([])

  // People with access to the project (project creator + members), used for the assignee select
  const [projectMembers, setProjectMembers] = useState<
    Array<{ id: string; name: string | null; email: string; avatarUrl?: string | null }>
  >([])

  // Slack send state (for the AI-generated "changes" field)
  const [sendingToSlack, setSendingToSlack] = useState(false)
  const [deletingFromSlack, setDeletingFromSlack] = useState(false)

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

  // Collapsible "changes" (Slack notes) section
  const [showNotes, setShowNotes] = useState(Boolean(task?.changes))

  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"

  // Auto-save state (edit mode only)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Latest onTaskUpdated callback, accessed via ref so autoSave stays stable
  // even when the parent passes a new (non-memoized) callback each render.
  const onTaskUpdatedRef = useRef(onTaskUpdated)
  onTaskUpdatedRef.current = onTaskUpdated
  // Read-only state read from a ref so the stable autoSave callback can bail out
  // without changing identity (which would retrigger the auto-save watcher).
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly
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
  // The picker doubles as the server-side schedule; this tells a time that is
  // actually scheduled apart from one that was only picked.
  const [slackScheduleConfirmed, setSlackScheduleConfirmed] = useState(Boolean(task?.changesScheduledSendAt))
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

  // Fetch attachments for the task (edit mode). The board list endpoints don't
  // all include attachments (e.g. the project board omits them), so the task
  // object passed in can be missing them — load them authoritatively here.
  const fetchTaskAttachments = useCallback(async (tid: string) => {
    try {
      const response = await fetch(`/api/tasks/${tid}/attachments`)
      if (response.ok) {
        const data = await response.json()
        setTaskAttachments(data.attachments || [])
      }
    } catch (error) {
      console.error("Error fetching attachments:", error)
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

  // Load attachments when editing a task (the prop may not carry them).
  useEffect(() => {
    if (isEditMode && task?.id) {
      fetchTaskAttachments(task.id)
    }
  }, [isEditMode, task?.id, fetchTaskAttachments])

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
      setSlackScheduleConfirmed(Boolean(task.changesScheduledSendAt))
      setShowNotes(Boolean(task.changes))
      setSavedAt(null)
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
      setTaskAttachments(task.attachments || [])
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
    if (!isEditMode || !task || readOnlyRef.current) return
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
        setSavedAt(new Date())
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

  // Latest snapshot reachable from the stable flush callback below.
  const autoSaveSnapshotRef = useRef(autoSaveSnapshot)
  autoSaveSnapshotRef.current = autoSaveSnapshot

  // Persist pending changes immediately. Wired to the form's blur (focusout),
  // so a field is saved the moment the user moves to another one instead of
  // waiting for the debounce.
  const flushAutoSave = useCallback(() => {
    if (!isEditMode || readOnlyRef.current) return
    if (justLoadedRef.current) return
    if (autoSaveSnapshotRef.current === lastSavedSnapshotRef.current) return
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
    autoSave(autoSaveSnapshotRef.current)
  }, [isEditMode, autoSave])
  const flushAutoSaveRef = useRef(flushAutoSave)
  flushAutoSaveRef.current = flushAutoSave

  // On unmount (e.g. the dialog closes mid-debounce) flush instead of dropping
  // the pending change.
  useEffect(() => {
    return () => {
      flushAutoSaveRef.current()
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

  // Reported time = direct task time entries + time logged on subtasks (summed in TimeReport).
  const taskReportedHours = timeEntries.reduce((sum, e) => sum + e.hours, 0)
  const subtaskReportedHours = subtasks.reduce((sum, s) => sum + (s.timeSpent || 0), 0)
  const plannedHours = selectValueToHours(estimatedHours) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return
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
      // Soft-delete with a 5s undo window. The helper shows the "Cofnij" toast;
      // restoring refreshes the parent view via onTaskUpdated.
      const result = await softDeleteTaskWithUndo(task.id, {
        onRestored: () => onTaskUpdated?.(),
      })
      if (result.ok) {
        onTaskDeleted?.()
        handleClose()
      } else {
        toast.error(result.error || "Nie udało się usunąć zadania")
      }
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
          setSlackScheduleConfirmed(true)
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

  // Delete the previously sent message from the project's Slack channel.
  // Handy for cleaning up test messages.
  const handleDeleteFromSlack = async () => {
    if (!task) return
    setDeletingFromSlack(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/slack`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (response.ok) {
        setSlackSentAt(null)
        toast.success("Usunięto wiadomość ze Slacka")
      } else {
        toast.error(data.error || "Nie udało się usunąć wiadomości ze Slacka")
      }
    } catch (error) {
      console.error("Error deleting from Slack:", error)
      toast.error("Nie udało się usunąć wiadomości ze Slacka")
    } finally {
      setDeletingFromSlack(false)
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

        // Surface the new attachment immediately. The parent's task snapshot
        // isn't refreshed after upload, so we update our own list from the
        // response instead of waiting on onTaskUpdated().
        const { attachment } = await response.json()
        if (attachment) setTaskAttachments(prev => [attachment, ...prev])

        // Keep the board / surrounding views in sync as well.
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

        // Drop it from the local list right away, then refresh task data.
        setTaskAttachments(prev => prev.filter(a => a.id !== fileId))
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

  const currentStatus = taskStatuses.find(status => status.id === statusId)
  const currentPriority = getPriorityOptions().find(option => option.value === priority)
  const projectName =
    projectsList.find(p => p.id === selectedProjectId)?.name ??
    (task?.project?.id === selectedProjectId ? task?.project?.name : undefined)
  const completedSubtasks = subtasks.filter(s => s.isCompleted).length
  // Creating from a project board pins the task to that board's project.
  const projectLocked = isCreateMode && Boolean(projectId)

  const toggleTag = (tagId: string) =>
    setSelectedTagIds(prev => (prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]))

  const copyTaskKey = async () => {
    if (!task) return
    try {
      await navigator.clipboard.writeText(task.key || task.id)
      toast.success(`Skopiowano ${task.key || "identyfikator zadania"}`)
    } catch {
      toast.error("Nie udało się skopiować")
    }
  }

  const slackStatus = slackSentAt
    ? { label: `Wysłano ${new Date(slackSentAt).toLocaleDateString("pl-PL")}`, className: "text-success" }
    : slackScheduledSendAt && slackScheduleConfirmed
      ? { label: `Zaplanowano na ${slackScheduledSendAt.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}`, className: "text-primary" }
      : changes.trim()
        ? { label: "Szkic", className: "text-muted-foreground" }
        : null

  // Date pickers rendered as quiet inline controls inside the properties panel.
  const inlinePickerClass = "h-8 border-transparent bg-transparent px-2.5 text-[13px] shadow-none hover:bg-accent [&_svg]:mr-1.5 [&_svg]:size-3.5"

  // --- Sections -------------------------------------------------------------

  const titleField = (
    <TextareaAutosize
      id="title"
      aria-label="Tytuł zadania"
      placeholder="Tytuł zadania"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      required
      minRows={1}
      className="w-full resize-none border-none bg-transparent p-0 text-xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-2xl"
    />
  )

  const descriptionField = (
    <RichTextEditor
      content={description}
      onChange={setDescription}
      placeholder="Dodaj opis — kontekst, kryteria akceptacji, linki…"
      showToolbarOnFocus={true}
      editable={!readOnly}
    />
  )

  const propertyFields = (
    <>
      <PropertyRow label="Status" icon={CircleDot} htmlFor="task-status">
        <NativeSelect
          id="task-status"
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
          leading={<span className="size-2 rounded-full" style={{ backgroundColor: currentStatus?.color || "var(--muted-foreground)" }} />}
        >
          <option value="">Brak statusu</option>
          {taskStatuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </NativeSelect>
      </PropertyRow>

      <PropertyRow label="Osoba" icon={UserRound} htmlFor="task-assignee">
        <NativeSelect
          id="task-assignee"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          disabled={isCreateMode && forceAssignToCurrentUser}
        >
          <option value="">Nieprzypisane</option>
          {assigneeOptions.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name || member.email}
              {member.id === session?.user?.id ? " (Ty)" : ""}
            </option>
          ))}
        </NativeSelect>
      </PropertyRow>

      <PropertyRow label="Priorytet" icon={Flag} htmlFor="task-priority">
        <NativeSelect
          id="task-priority"
          value={priority || "none"}
          onChange={(e) => setPriority(e.target.value === "none" ? "" : e.target.value)}
          leading={<span className={cn("size-2 rounded-full", currentPriority?.color ?? "bg-muted-foreground/40")} />}
        >
          <option value="none">Brak</option>
          {getPriorityOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </PropertyRow>

      <PropertyRow label="Projekt" icon={FolderKanban} htmlFor="task-project">
        <NativeSelect
          id="task-project"
          value={selectedProjectId || "no-project"}
          onChange={(e) => setSelectedProjectId(e.target.value === "no-project" ? "" : e.target.value)}
          disabled={projectLocked}
        >
          <option value="no-project">Bez projektu</option>
          {projectsList.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
      </PropertyRow>

      <PropertyRow label={timePlanningMode === "reporting" ? "Termin" : "Termin (opcj.)"} icon={CalendarClock}>
        <DateTimePicker
          value={dueDate}
          onChange={setDueDate}
          placeholder="Ustaw termin"
          className={inlinePickerClass}
          disablePast={isCreateMode}
          defaultTimeOnSelect={isCreateMode}
        />
      </PropertyRow>

      {availableTags.length > 0 && (
        <PropertyRow label="Tagi" icon={Tags}>
          <TagPicker tags={availableTags} selectedIds={selectedTagIds} onToggle={toggleTag} />
        </PropertyRow>
      )}
    </>
  )

  const timeSection = (
    <div className="space-y-3">
      <SectionHeader icon={Timer} title="Czas pracy" />
      <Segmented
        label="Tryb planowania czasu"
        value={timePlanningMode}
        onChange={handleTimePlanningModeChange}
        options={[
          { value: "reporting", label: "Raportowanie" },
          { value: "scheduled", label: "Zaplanowana praca" },
        ]}
      />
      <div className="space-y-1">
        {timePlanningMode === "scheduled" && (
          <>
            <PropertyRow label="Początek *" icon={CalendarRange}>
              <DateTimePicker
                value={startTime}
                onChange={setStartTime}
                placeholder="Wybierz początek"
                className={inlinePickerClass}
                disablePast={isCreateMode}
              />
            </PropertyRow>
            <PropertyRow label="Koniec *" icon={CalendarRange}>
              <DateTimePicker
                value={endTime}
                onChange={setEndTime}
                placeholder="Wybierz koniec"
                className={inlinePickerClass}
                disablePast={isCreateMode}
              />
            </PropertyRow>
          </>
        )}
        <PropertyRow label="Szacowany" icon={Hourglass} htmlFor="estimatedHours">
          {timePlanningMode === "reporting" ? (
            <NativeSelect id="estimatedHours" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)}>
              {getEstimatedHoursOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <span className="flex h-8 items-center px-2.5 text-[13px] text-muted-foreground">
              {estimatedHours && estimatedHours !== "none"
                ? `${selectValueToHours(estimatedHours)} h (wyliczone)`
                : "z początku i końca"}
            </span>
          )}
        </PropertyRow>
      </div>
      {isEditMode && task && (
        <TimeReport
          entries={timeEntries}
          taskHours={taskReportedHours}
          subtaskHours={subtaskReportedHours}
          plannedHours={plannedHours}
          newHours={newTimeHours}
          onNewHoursChange={setNewTimeHours}
          onAdd={handleAddTimeEntry}
          onDelete={handleDeleteTimeEntry}
          adding={loggingTime}
          open={showTimeReporting}
          onOpenChange={setShowTimeReporting}
        />
      )}
    </div>
  )

  const reminderSection = (
    <ReminderSettings
      reminderEnabled={reminderEnabled}
      reminderType={reminderType}
      reminderValue={reminderValue}
      dueDate={dueDate}
      onReminderChange={handleReminderChange}
    />
  )

  const documentsSection = isCreateMode ? (
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
        title="Dokumenty"
        description="Dodaj dokumenty do zadania (max 10MB każdy)"
        categories={["specification", "design", "manual", "other"]}
        showCategories={false}
        showDescriptions={false}
        className="rounded-xl border bg-card p-4"
      />
      {uploadingFiles && (
        <p className="text-sm text-muted-foreground">Przesyłanie plików…</p>
      )}
    </div>
  ) : (
    <FileUpload
      files={taskAttachments}
      onFileUpload={handleFileUpload}
      onFileDelete={handleFileDelete}
      editable={!readOnly}
      accept="*/*"
      maxSize={10 * 1024 * 1024}
      maxFiles={10}
      title="Dokumenty"
      description="Dokumenty załączone do zadania"
      categories={["specification", "design", "manual", "other"]}
      showCategories={true}
      showDescriptions={true}
      className="rounded-xl border bg-card p-4"
    />
  )

  const errorBanner = error ? (
    <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
      {error}
    </div>
  ) : null

  // --- Edit mode only -------------------------------------------------------

  const subtasksSection = (
    <section className="space-y-3">
      <SectionHeader
        icon={ListChecks}
        title="Podzadania"
        meta={subtasks.length > 0 ? `${completedSubtasks}/${subtasks.length}` : undefined}
      >
        {hasSubtaskChanges && !readOnly && (
          <span className="text-[11px] font-medium text-warning">Niezapisane zmiany</span>
        )}
      </SectionHeader>
      {subtasks.length > 0 && (
        <Meter value={completedSubtasks} max={subtasks.length} label="Ukończone podzadania" />
      )}
      <SubtaskList subtasks={subtasks} onChange={setSubtasks} readOnly={readOnly} />
    </section>
  )

  const slackSection = (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setShowNotes(open => !open)}
        aria-expanded={showNotes}
        aria-controls="task-changes"
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", showNotes && "rotate-90")} />
        <MessageSquareText className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-[13px] font-semibold">Notatki ze zmian</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">· Slack</span>
        {slackStatus && (
          <span className={cn("ml-auto truncate text-xs font-medium", slackStatus.className)}>{slackStatus.label}</span>
        )}
      </button>
      {showNotes && (
        <div id="task-changes" className="space-y-3 border-t px-4 py-4">
          <TextareaAutosize
            id="changes"
            value={changes}
            onChange={(e) => {
              setChanges(e.target.value)
              if (slackSentAt) setSlackSentAt(null)
              if (slackScheduledSendAt) {
                setSlackScheduledSendAt(undefined)
                setSlackScheduleConfirmed(false)
              }
            }}
            placeholder="Co się zmieniło? Treść trafi na Slacka w formacie markdown."
            minRows={4}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-52 flex-1">
              <DateTimePicker
                value={slackScheduledSendAt}
                onChange={(date) => {
                  setSlackScheduledSendAt(date)
                  setSlackScheduleConfirmed(false)
                }}
                placeholder="Wyślij od razu lub zaplanuj…"
                className="h-8 text-[13px]"
              />
            </div>
            {slackScheduledSendAt && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSlackScheduledSendAt(undefined)
                  setSlackScheduleConfirmed(false)
                }}
              >
                Wyczyść
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => handleSendToSlack(slackScheduledSendAt)}
              disabled={sendingToSlack || !changes.trim()}
            >
              <Send />
              {sendingToSlack ? "Wysyłanie…" : slackScheduledSendAt ? "Zaplanuj wysyłkę" : "Wyślij na Slacka"}
            </Button>
          </div>
          {slackScheduledSendAt && slackScheduleConfirmed && !slackSentAt && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              Wysyłka {slackScheduledSendAt.toLocaleString("pl-PL")} · teraz {serverTime.toLocaleTimeString("pl-PL")}
            </p>
          )}
          {slackSentAt && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-success">
                <Check className="size-3.5" />
                Wysłano {new Date(slackSentAt).toLocaleString("pl-PL")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDeleteFromSlack}
                disabled={deletingFromSlack}
              >
                <Trash2 className="size-3" />
                {deletingFromSlack ? "Usuwanie…" : "Usuń ze Slacka"}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )

  const branchControl = branchCreated ? (
    <a
      href={branchCreated.url || makeBranchUrl(branchCreated.name, task?.project?.githubRepo) || '#'}
      target="_blank"
      rel="noopener noreferrer"
      title={`Otwórz branch ${branchCreated.name} na GitHub`}
      className="inline-flex h-8 max-w-[13rem] items-center gap-1.5 rounded-md px-2 font-mono text-xs text-success transition-colors hover:bg-accent"
    >
      <GitBranch className="size-3.5 shrink-0" />
      <span className="truncate">{branchCreated.name}</span>
    </a>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCreateGithubBranch}
      disabled={creatingBranch}
      title="Utwórz branch GitHub"
      className="h-8 gap-1.5 text-muted-foreground"
    >
      <GitBranch />
      <span className="hidden md:inline">{creatingBranch ? "Tworzenie…" : "Utwórz branch"}</span>
    </Button>
  )

  // Header: where the task lives + auto-save state and actions. Shown for every
  // edit view and for the create dialog (the create page has its own title).
  const header = isEditMode || onClose ? (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
      {isEditMode && task ? (
        <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: task.project?.color || "var(--primary)" }}
          />
          <span className="truncate text-muted-foreground">{projectName ?? "Bez projektu"}</span>
          {task.key && (
            <>
              <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground/60" />
              <span className="shrink-0 font-mono text-xs font-medium select-all">{task.key}</span>
            </>
          )}
          {readOnly && (
            <span className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              <Eye className="size-3" />
              Tylko podgląd
            </span>
          )}
        </div>
      ) : (
        <h2 className="text-sm font-semibold">Nowe zadanie</h2>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {isEditMode && task && (
          <>
            {!readOnly && <SaveIndicator saving={isSaving} savedAt={savedAt} />}
            {!readOnly && branchControl}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Więcej akcji">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={copyTaskKey}>
                  <Copy />
                  Kopiuj klucz zadania
                </DropdownMenuItem>
                {!readOnly && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setShowDeleteConfirm(true)}>
                      <Trash2 />
                      Usuń zadanie
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {onClose && (
          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={handleClose} aria-label="Zamknij">
            <X />
          </Button>
        )}
      </div>
    </header>
  ) : null

  return (
    <form onSubmit={handleSubmit} onBlur={flushAutoSave} className="modal-form flex min-h-0 flex-1 flex-col">
      {header}

      {/* The body scrolls on its own so the header and footer stay put in the dialog.
          Columns follow the container width (not the viewport), since the same
          form renders in dialogs and pages of different sizes. */}
      <div className="@container min-h-0 flex-1 overflow-y-auto">
        <fieldset
          disabled={readOnly}
          className={cn(
            "m-0 min-w-0 border-0 p-0 disabled:opacity-100",
            isEditMode && "grid @3xl:min-h-full @3xl:grid-cols-[minmax(0,1fr)_21rem]"
          )}
        >
          {isEditMode && task ? (
            <>
              {/* Main column: what the task is about and the work on it */}
              <div className="min-w-0 space-y-8 px-4 py-6 sm:px-6">
                <div className="space-y-4">
                  {titleField}
                  {task.githubWorkflowError && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <div className="min-w-0 space-y-1">
                        <span className="block font-semibold">Błąd GitHub Workflow</span>
                        <p className="text-xs break-all">{task.githubWorkflowError}</p>
                      </div>
                    </div>
                  )}
                  {descriptionField}
                </div>
                {subtasksSection}
                {documentsSection}
                {slackSection}
                {errorBanner}
                <section className="border-t pt-6">
                  <TaskComments
                    taskId={task.id}
                    readOnly={readOnly}
                    onCommentsChanged={() => onTaskUpdatedRef.current?.()}
                  />
                </section>
              </div>

              {/* Side panel: task parameters */}
              <aside aria-label="Właściwości zadania" className="space-y-6 border-t bg-muted px-4 py-6 sm:px-5 @3xl:border-t-0 @3xl:border-l">
                <div className="space-y-1">
                  <p className="kicker mb-2 text-muted-foreground">Właściwości</p>
                  {propertyFields}
                </div>
                {timeSection}
                {reminderSection}
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Utworzone {new Date(task.createdAt).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}
                  {task.createdBy?.name ? ` przez ${task.createdBy.name}` : ""}
                </p>
              </aside>
            </>
          ) : (
            <div className="space-y-6 px-4 py-6 sm:px-6">
              <div className="space-y-4">
                {titleField}
                {descriptionField}
              </div>
              <div className="grid gap-x-6 gap-y-1 rounded-xl border bg-card p-3 @xl:grid-cols-2">
                {propertyFields}
              </div>
              <div className="rounded-xl border bg-card p-4">{timeSection}</div>
              {documentsSection}
              {reminderSection}
              {errorBanner}
            </div>
          )}
        </fieldset>
      </div>

      {/* Footer — hidden in read-only mode (view only) */}
      {!readOnly && (
        <footer className="flex shrink-0 items-center gap-2 border-t px-4 py-3 sm:px-6">
          {isEditMode && (
            <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
              {hasSubtaskChanges ? "Podzadania zapiszą się po kliknięciu „Zapisz”." : "Zmiany pól zapisują się automatycznie."}
            </p>
          )}
          <div className="ml-auto flex items-center gap-2">
            {onClose && (
              <Button type="button" variant="ghost" onClick={handleClose}>
                {isCreateMode ? "Anuluj" : "Zamknij"}
              </Button>
            )}
            <Button type="submit" disabled={loading || !isFormValid() || isSaving} className="min-w-36">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  {isCreateMode ? "Tworzenie…" : "Zapisywanie…"}
                </>
              ) : isCreateMode ? (
                "Utwórz zadanie"
              ) : (
                "Zapisz i zamknij"
              )}
            </Button>
          </div>
        </footer>
      )}

      {isEditMode && task && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć zadanie?</AlertDialogTitle>
              <AlertDialogDescription>
                „{task.title}” zostanie usunięte. Przez 5 sekund możesz je przywrócić przyciskiem „Cofnij”.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteTask()
                }}
                disabled={deleting}
                className={buttonVariants({ variant: "destructive" })}
              >
                {deleting ? "Usuwanie…" : "Usuń zadanie"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </form>
  )
}
