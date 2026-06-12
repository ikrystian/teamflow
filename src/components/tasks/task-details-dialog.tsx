"use client"

import { useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Task } from "@/types"
import { TaskFormContent } from "../shared/task-form-content"

interface TaskDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit?: (task: Task, e: React.MouseEvent) => void
  onTimeTracking?: (task: Task, e: React.MouseEvent) => void
  onDelete?: (task: Task, e: React.MouseEvent) => void
  onTaskUpdated?: () => void
  onTaskCreated?: () => void
  onTaskDeleted?: () => void
  canEdit?: boolean

  // For create mode
  mode?: "create" | "edit"
  projectId?: string
  projects?: Array<{ id: string; name: string }>
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  onTaskUpdated,
  onTaskCreated,
  onTaskDeleted,
  mode = "edit",
  projectId,
  projects = [],
}: TaskDetailsDialogProps) {
  const isCreateMode = mode === "create"

  // Reflect the opened task in the URL (e.g. ?task=PS-12) and restore the
  // previous URL when the dialog closes. Edit mode only — create has no key.
  const prevUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (typeof window === "undefined") return

    if (open && !isCreateMode && task) {
      if (prevUrlRef.current === null) {
        prevUrlRef.current = window.location.href
      }
      const url = new URL(window.location.href)
      url.searchParams.set("task", task.key || task.id)
      window.history.replaceState(null, "", url.toString())
    } else if (!open && prevUrlRef.current !== null) {
      window.history.replaceState(null, "", prevUrlRef.current)
      prevUrlRef.current = null
    }
  }, [open, isCreateMode, task])

  if (!isCreateMode && !task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Pinned a fixed distance from the top of the viewport (instead of
        // vertically centered) so the dialog doesn't jump when its content
        // grows or shrinks, e.g. after expanding a section.
        className="xl:max-w-3xl top-[6vh] translate-y-0 max-h-[88vh] flex flex-col overflow-hidden"
        showCloseButton={false}
        disableAnimation
      >
        <DialogHeader className="hidden">
          <DialogTitle className="hidden">
            {isCreateMode ? "Utwórz zadanie" : task?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-1">
          <TaskFormContent
            task={task}
            mode={mode}
            projectId={projectId}
            projects={projects}
            onClose={() => onOpenChange(false)}
            onTaskUpdated={onTaskUpdated}
            onTaskCreated={onTaskCreated}
            onTaskDeleted={() => { onTaskDeleted?.(); onOpenChange(false) }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
