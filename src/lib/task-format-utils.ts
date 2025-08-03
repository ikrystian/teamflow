/**
 * Utilities for formatting task fields consistently across the application
 */

/**
 * Formats estimated hours value for display
 * @param hours - Number of hours or null/undefined
 * @returns Formatted string like "2h", "1.5h", or "Brak szacunku"
 */
export const formatEstimatedHours = (hours?: number | null): string => {
  if (!hours || hours === 0) {
    return "Brak szacunku"
  }

  // Format to remove unnecessary decimals
  const formatted = hours % 1 === 0 ? hours.toString() : hours.toString()
  return `${formatted}h`
}

/**
 * Formats assignee information for display
 * @param assignee - User object or null/undefined
 * @returns Object with display name and initials
 */
export const formatAssignee = (assignee?: { id: string; name?: string | null; email?: string | null; avatarUrl?: string | null; image?: string | null; role?: string } | null) => {
  if (!assignee) {
    return {
      displayName: "Nieprzypisany",
      initials: "?",
      isEmpty: true
    }
  }

  const displayName = assignee.name || assignee.email || "Nieznany użytkownik"
  const initials = assignee.name?.charAt(0).toUpperCase() || assignee.email?.charAt(0).toUpperCase() || "U"

  return {
    displayName,
    initials,
    isEmpty: false,
    user: assignee
  }
}

/**
 * Standard priority options for select components
 */
export const getPriorityOptions = () => [
  { value: "Low", label: "Niski", color: "bg-green-500", colorClass: "bg-green-100 text-green-800 border-green-200", shortName: "N" },
  { value: "Medium", label: "Średni", color: "bg-yellow-500", colorClass: "bg-yellow-100 text-yellow-800 border-yellow-200", shortName: "Ś" },
  { value: "High", label: "Wysoki", color: "bg-red-500", colorClass: "bg-red-100 text-red-800 border-red-200", shortName: "W" }
]

/**
 * Get priority color classes for badges
 */
export const getPriorityColor = (priority?: string) => {
  const option = getPriorityOptions().find(opt => opt.value === priority)
  return option?.colorClass || "bg-gray-100 text-gray-800 border-gray-200"
}

/**
 * Get priority display name in Polish
 */
export const getPriorityDisplayName = (priority?: string) => {
  const option = getPriorityOptions().find(opt => opt.value === priority)
  return option?.label || "Brak"
}

/**
 * Get priority short name for compact display
 */
export const getPriorityShortName = (priority?: string) => {
  const option = getPriorityOptions().find(opt => opt.value === priority)
  return option?.shortName || "-"
}

/**
 * Converts priority to select option value
 * @param priority - Priority string or null/undefined
 * @returns String value for select component
 */
export const priorityToSelectValue = (priority?: string | null): string => {
  return priority || "none"
}

/**
 * Converts select option value to priority
 * @param value - String value from select component
 * @returns Priority string or undefined
 */
export const selectValueToPriority = (value: string): string | undefined => {
  if (value === "none" || !value) {
    return undefined
  }
  return value
}

/**
 * Standard project display format
 * @param project - Project object with name and team
 * @returns Formatted string "Project Name • Team Name"
 */
export const formatProjectDisplay = (project?: { name: string; team: { name: string } } | null): string => {
  if (!project) {
    return "Brak projektu"
  }
  return `${project.name} • ${project.team.name}`
}

/**
 * Converts project to select option value
 * @param project - Project object or null/undefined
 * @returns String value for select component
 */
export const projectToSelectValue = (project?: { id: string } | null): string => {
  return project?.id || "no-project"
}

/**
 * Converts select option value to project id
 * @param value - String value from select component
 * @returns Project id or undefined
 */
export const selectValueToProjectId = (value: string): string | undefined => {
  if (value === "no-project" || !value) {
    return undefined
  }
  return value
}

/**
 * Standard estimated hours options for select components
 */
export const getEstimatedHoursOptions = () => [
  { value: "none", label: "Brak szacunku" },
  { value: "0.5", label: "30 minut" },
  { value: "1", label: "1 godzina" },
  { value: "1.5", label: "1.5 godziny" },
  { value: "2", label: "2 godziny" },
  { value: "2.5", label: "2.5 godziny" },
  { value: "3", label: "3 godziny" },
  { value: "3.5", label: "3.5 godziny" },
  { value: "4", label: "4 godziny" },
  { value: "4.5", label: "4.5 godziny" },
  { value: "5", label: "5 godzin" },
  { value: "5.5", label: "5.5 godziny" },
  { value: "6", label: "6 godzin" },
  { value: "6.5", label: "6.5 godziny" },
  { value: "7", label: "7 godzin" },
  { value: "7.5", label: "7.5 godziny" },
  { value: "8", label: "8 godzin" },
  { value: "12", label: "12 godzin" },
  { value: "16", label: "16 godzin" },
  { value: "24", label: "24 godziny" },
  { value: "40", label: "40 godzin" }
]

/**
 * Converts estimated hours value to select option value
 * @param hours - Number of hours or null/undefined
 * @returns String value for select component
 */
export const hoursToSelectValue = (hours?: number | null): string => {
  if (!hours && hours !== 0) {
    return "none"
  }
  return hours.toString()
}

/**
 * Converts select option value to estimated hours
 * @param value - String value from select component
 * @returns Number of hours or undefined
 */
export const selectValueToHours = (value: string): number | undefined => {
  if (value === "none" || !value) {
    return undefined
  }
  const parsed = parseFloat(value)
  return isNaN(parsed) ? undefined : parsed
}

/**
 * Converts assignee to select option value
 * @param assignee - User object or null/undefined
 * @returns String value for select component
 */
export const assigneeToSelectValue = (assignee?: { id: string } | null): string => {
  return assignee?.id || "unassigned"
}

/**
 * Converts select option value to assignee id
 * @param value - String value from select component
 * @returns User id or undefined
 */
export const selectValueToAssigneeId = (value: string): string | undefined => {
  if (value === "unassigned" || !value) {
    return undefined
  }
  return value
}
