"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSwipeToDismiss } from "@/hooks/use-swipe"
import { cn } from "@/lib/utils"
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
  canEdit,
  mode = "edit",
  projectId,
  projects = [],
}: TaskDetailsDialogProps) {
  const isCreateMode = mode === "create"
  // In edit mode, an explicit canEdit={false} renders the task read-only
  // (e.g. a manager viewing an In Progress / Done task).
  const readOnly = !isCreateMode && canEdit === false

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

  // Phones: drag the sheet down by its grab handle or header to close it.
  const [content, setContent] = useState<HTMLDivElement | null>(null)
  useSwipeToDismiss(content, {
    direction: "down",
    handle: "[data-swipe-handle], .modal-form > header",
    onDismiss: () => onOpenChange(false),
  })

  if (!isCreateMode && !task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={setContent}
        // Pinned a fixed distance from the top of the viewport (instead of
        // vertically centered) so the dialog doesn't jump when its content
        // grows or shrinks, e.g. after expanding a section.
        // The form fills the dialog edge to edge: its own header and footer stay
        // put while the body scrolls. Edit mode is wide enough for the
        // content | properties columns; the form collapses them when narrower.
        className={cn(
          "top-[5vh] flex max-h-[90vh] translate-y-0 flex-col gap-0 overflow-hidden p-0",
          // Phones: a full-height sheet that slides up from the bottom edge and
          // keeps its footer above the home indicator.
          "max-sm:inset-x-0 max-sm:top-[calc(env(safe-area-inset-top)+0.5rem)] max-sm:bottom-0 max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[env(safe-area-inset-bottom)]",
          "max-sm:duration-300 max-sm:data-[state=open]:animate-in max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:animate-out max-sm:data-[state=closed]:slide-out-to-bottom",
          "[&_.modal-form>header]:max-sm:touch-none",
          isCreateMode ? "sm:max-w-3xl" : "md:max-w-5xl"
        )}
        showCloseButton={false}
        disableAnimation
      >
        <div data-swipe-handle aria-hidden className="flex h-4 shrink-0 touch-none items-end justify-center sm:hidden">
          <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        <DialogHeader className="sr-only">
          <DialogTitle>{isCreateMode ? "Nowe zadanie" : task?.title}</DialogTitle>
          <DialogDescription>
            {isCreateMode ? "Uzupełnij szczegóły nowego zadania" : `Szczegóły zadania ${task?.key ?? ""}`}
          </DialogDescription>
        </DialogHeader>
        <TaskFormContent
          task={task}
          mode={mode}
          readOnly={readOnly}
          projectId={projectId}
          projects={projects}
          onClose={() => onOpenChange(false)}
          onTaskUpdated={onTaskUpdated}
          onTaskCreated={onTaskCreated}
          onTaskDeleted={() => { onTaskDeleted?.(); onOpenChange(false) }}
        />
      </DialogContent>
    </Dialog>
  )
}
