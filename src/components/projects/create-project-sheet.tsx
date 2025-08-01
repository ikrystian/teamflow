"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { CreateProjectContent } from "./create-project-content"

interface Team {
  id: string
  name: string
}

interface CreateProjectSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: () => void
  teams: Team[]
}

export function CreateProjectSheet({
  open,
  onOpenChange,
  onProjectCreated,
  teams
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
              teams={teams}
              onClose={() => onOpenChange(false)}
              showIconSelector={true}
            />
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
