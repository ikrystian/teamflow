"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { TaskFormContent } from "./task-form-content"
import type { Task, Project } from "@/types"



interface TaskFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated?: () => void
  onTaskUpdated?: (task?: Task) => void

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

export function TaskFormSheet({
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
}: TaskFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <VisuallyHidden>
            <SheetTitle>
              {mode === "create" ? "Utwórz nowe zadanie" : `Edytuj zadanie: ${task?.title || ""}`}
            </SheetTitle>
          </VisuallyHidden>
          <div className="px-4 flex-1 overflow-y-auto">
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
              variant="sheet"
            />
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
