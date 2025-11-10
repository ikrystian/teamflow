"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TaskFormContent } from "./task-form-content"
import type { Task, User } from "@/types"

interface Project {
  id: string
  name: string
}

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated?: () => void
  onTaskUpdated?: () => void

  // For create mode
  projects?: Project[]
  projectId?: string
  defaultStatusId?: string
  forceAssignToCurrentUser?: boolean // When true, always assign to current user regardless of project

  // For edit mode
  task?: Task | null

  // Mode determination
  mode: "create" | "edit"
}

export function TaskFormDialog({
  open,
  onOpenChange,
  onTaskCreated,
  onTaskUpdated,
  projects = [],
  projectId,
  defaultStatusId,
  forceAssignToCurrentUser = false,
  task,
  mode
}: TaskFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {mode === "create" ? "Utwórz nowe zadanie" : "Edytuj zadanie"}
          </DialogTitle>
        </DialogHeader>
        <TaskFormContent
          onTaskCreated={onTaskCreated}
          onTaskUpdated={onTaskUpdated}
          onClose={() => onOpenChange(false)}
          projects={projects}
          projectId={projectId}
          defaultStatusId={defaultStatusId}
          forceAssignToCurrentUser={forceAssignToCurrentUser}
          task={task}
          mode={mode}
          variant="dialog"
        />
      </DialogContent>
    </Dialog>
  )
}