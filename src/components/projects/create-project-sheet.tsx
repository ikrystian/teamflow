"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { CreateProjectContent } from "./create-project-content"


interface CreateProjectSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: () => void
  /** Preselected CRM client (e.g. when creating a project from the client card). */
  defaultClientId?: string | null
}

export function CreateProjectSheet({
  open,
  onOpenChange,
  onProjectCreated,
  defaultClientId,
}: CreateProjectSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <VisuallyHidden>
            <SheetTitle>Utwórz nowy projekt</SheetTitle>
          </VisuallyHidden>
          <div className="px-4 flex-1 overflow-y-auto">
            <CreateProjectContent
              onProjectCreated={onProjectCreated}
              onClose={() => onOpenChange(false)}
              showIconSelector={true}
              defaultClientId={defaultClientId}
            />
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
