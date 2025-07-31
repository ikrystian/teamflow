"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreateProjectContent } from "./create-project-content"

interface Team {
  id: string
  name: string
}

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: () => void
  teams: Team[]
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
  teams
}: CreateProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">Utwórz nowy projekt</DialogTitle>
        </DialogHeader>
        <CreateProjectContent
          onProjectCreated={onProjectCreated}
          teams={teams}
          onClose={() => onOpenChange(false)}
          showIconSelector={false}
        />
      </DialogContent>
    </Dialog>
  )
}
