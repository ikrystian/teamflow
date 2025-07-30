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
 * Check if task is overdue (one day after due date)
 */
export const isTaskOverdue = (dueDate?: string) => {
  if (!dueDate) return false
  const today = new Date()
  const due = new Date(dueDate)
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  
  // Task is overdue one day after the due date
  const overdueDate = new Date(due)
  overdueDate.setDate(due.getDate() + 1)
  
  return today >= overdueDate
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

