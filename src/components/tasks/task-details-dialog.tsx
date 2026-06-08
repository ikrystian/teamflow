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
  canEdit?: boolean
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  onEdit,
  onTimeTracking,
  onDelete,
  onTaskUpdated,
  canEdit = false
}: TaskDetailsDialogProps) {
  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">{task.title}</DialogTitle>
        </DialogHeader>
        <div>
          <TaskFormContent task={task} mode="edit" onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
