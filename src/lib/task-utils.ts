/**
 * Utility functions for task formatting and display
 */

import type { TaskStatus } from "@/types"

/**
 * Get priority color classes for badges
 */
export const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-800 border-red-200"
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "Low":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

/**
 * Get priority display name in Polish
 */
export const getPriorityDisplayName = (priority?: string) => {
  switch (priority) {
    case "High":
      return "Wysoki"
    case "Medium":
      return "Średni"
    case "Low":
      return "Niski"
    default:
      return "Brak"
  }
}

/**
 * Get priority short name for compact display
 */
export const getPriorityShortName = (priority?: string) => {
  switch (priority) {
    case "High":
      return "W"
    case "Medium":
      return "Ś"
    case "Low":
      return "N"
    default:
      return "-"
  }
}

/**
 * Get task status from statusId
 */
export const getTaskStatus = (task: { statusId?: string }, taskStatuses: TaskStatus[]) => {
  if (task.statusId) {
    return taskStatuses.find(status => status.id === task.statusId)
  }
  return null
}

/**
 * Check if task is overdue
 */
export const isTaskOverdue = (dueDate?: string) => {
  if (!dueDate) return false
  const today = new Date()
  const due = new Date(dueDate)
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

/**
 * Check if task is completed
 */
export const isTaskCompleted = (task: { statusId?: string }, taskStatuses: TaskStatus[]) => {
  const status = getTaskStatus(task, taskStatuses)
  return status?.name === "Done" || status?.name === "Completed"
}

/**
 * Get all available priority options
 */
export const getPriorityOptions = () => [
  { value: "Low", label: "Niski", color: "bg-green-100 text-green-800" },
  { value: "Medium", label: "Średni", color: "bg-yellow-100 text-yellow-800" },
  { value: "High", label: "Wysoki", color: "bg-red-100 text-red-800" }
]

/**
 * Check if task is blocked
 */
export const isTaskBlocked = (task: { isBlocked?: boolean }) => {
  return task.isBlocked === true
}

/**
 * Get blocked task styles
 */
export const getBlockedTaskStyles = (isBlocked?: boolean) => {
  if (isBlocked) {
    return {
      cardClass: "border-red-500 bg-red-50/50",
      borderColor: "#EF4444"
    }
  }
  return {
    cardClass: "",
    borderColor: undefined
  }
}

/**
 * Check if user can block/unblock a task
 * Only task creator or assignee can block/unblock tasks
 */
export const canUserBlockTask = (
  task: { createdBy?: { id: string }, assignee?: { id: string } },
  userId?: string
) => {
  if (!userId) return false
  return task.createdBy?.id === userId || task.assignee?.id === userId
}

/**
 * Calculate blocked duration for a task
 * Returns duration in milliseconds, or null if task is not blocked or missing dates
 */
export const calculateBlockedDuration = (
  blockedAt?: string,
  unblockedAt?: string
): number | null => {
  if (!blockedAt) return null

  const startDate = new Date(blockedAt)
  const endDate = unblockedAt ? new Date(unblockedAt) : new Date()

  return endDate.getTime() - startDate.getTime()
}

/**
 * Format blocked duration to human readable string
 */
export const formatBlockedDuration = (durationMs: number | null): string => {
  if (!durationMs) return "Nieznany czas"

  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    return `${days} dni${remainingHours > 0 ? `, ${remainingHours} godz.` : ""}`
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours} godz.${remainingMinutes > 0 ? `, ${remainingMinutes} min.` : ""}`
  } else if (minutes > 0) {
    return `${minutes} min.`
  } else {
    return `${seconds} sek.`
  }
}

/**
 * Get blocked duration info for a task
 */
export const getTaskBlockedDurationInfo = (task: {
  isBlocked?: boolean
  blockedAt?: string
  unblockedAt?: string
}) => {
  if (!task.isBlocked && !task.unblockedAt) {
    return null
  }

  const duration = calculateBlockedDuration(task.blockedAt, task.unblockedAt)
  const formattedDuration = formatBlockedDuration(duration)

  return {
    duration,
    formattedDuration,
    isCurrentlyBlocked: task.isBlocked || false,
    blockedAt: task.blockedAt,
    unblockedAt: task.unblockedAt
  }
}
