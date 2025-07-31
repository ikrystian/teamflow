"use client"

import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet"
import { TaskDetailsContent } from "@/components/tasks/task-details-content"
import type { Task } from "@/types"

interface TaskDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit?: (task: Task, e: React.MouseEvent) => void
  onTimeTracking?: (task: Task, e: React.MouseEvent) => void
  onDelete?: (task: Task, e: React.MouseEvent) => void
  onTaskUpdated?: () => void
  canEdit?: boolean
}

export function TaskDetailsSheet({
  open,
  onOpenChange,
  task,
  onEdit,
  onTimeTracking,
  onDelete,
  onTaskUpdated,
  canEdit = false
}: TaskDetailsSheetProps) {
  if (!task) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-hidden flex flex-col">
        <SheetHeader className="space-y-3 pb-4 border-b">
          <div className="px-4">
            <TaskDetailsContent
              task={task}
              onEdit={onEdit}
              onTimeTracking={onTimeTracking}
              onDelete={onDelete}
              onTaskUpdated={onTaskUpdated}
              canEdit={canEdit}
              onClose={() => onOpenChange(false)}
              showCommentsInTabs={false}
            />
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
