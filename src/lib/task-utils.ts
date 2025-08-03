/**
 * Utility functions for task formatting and display
 */

import type { TaskStatus } from "@/types"


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
