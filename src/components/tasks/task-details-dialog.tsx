"use client"

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
  canEdit?: boolean

  // For create mode
  mode?: "create" | "edit"
  projectId?: string
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  onTaskUpdated,
  onTaskCreated,
  mode = "edit",
  projectId,
}: TaskDetailsDialogProps) {
  const isCreateMode = mode === "create"

  if (!isCreateMode && !task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="hidden">
            {isCreateMode ? "Utwórz zadanie" : task?.title}
          </DialogTitle>
        </DialogHeader>
        <div>
          <TaskFormContent
            task={task}
            mode={mode}
            projectId={projectId}
            onClose={() => onOpenChange(false)}
            onTaskUpdated={onTaskUpdated}
            onTaskCreated={onTaskCreated}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
