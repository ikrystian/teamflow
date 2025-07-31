"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskDetailsContent } from "@/components/tasks/task-details-content"
import type { Task } from "@/types"

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
        <TaskDetailsContent
          task={task}
          onEdit={onEdit}
          onTimeTracking={onTimeTracking}
          onDelete={onDelete}
          onTaskUpdated={onTaskUpdated}
          canEdit={canEdit}
          onClose={() => onOpenChange(false)}
          showCommentsInTabs={true}
        />
      </DialogContent>
    </Dialog>
  )
}
