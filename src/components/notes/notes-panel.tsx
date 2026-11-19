"use client"

import { FolderPlus, NotebookPen, PanelRightClose, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { NoteEditor } from "./note-editor"
import { NotesList } from "./notes-list"
import { useNotesPanel } from "./notes-panel-provider"
import { useNotesActions, useNotesList } from "./use-notes"

const PANEL_ID = "notes-panel"

/** Przycisk w górnym pasku panelu: pokazuje i ukrywa prawy panel notatek. */
export function NotesToggleButton() {
  const { visible, toggle } = useNotesPanel()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-8 text-muted-foreground", visible && "bg-accent text-accent-foreground")}
          onClick={toggle}
          aria-label="Notatki"
          aria-pressed={visible}
          aria-controls={PANEL_ID}
        >
          <NotebookPen className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{visible ? "Ukryj notatki" : "Pokaż notatki"}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Prawy panel prywatnych notatek. Na komputerze stoi obok treści i ją zwęża (jak lewe
 * menu), na telefonie wysuwa się nad stronę. Jest częścią layoutu panelu, więc zostaje
 * otwarty (razem z edytowaną notatką) przy przechodzeniu między podstronami.
 */
export function NotesPanel() {
  const { open, openMobile, setOpenMobile, setOpen } = useNotesPanel()

  return (
    <>
      <aside
        id={PANEL_ID}
        aria-label="Notatki"
        inert={!open}
        className={cn(
          "hidden shrink-0 overflow-hidden transition-[width,margin] duration-200 ease-linear md:block",
          open ? "my-2 mr-2 w-[22rem]" : "my-2 mr-0 w-0"
        )}
      >
        <div className="glass-surface flex h-[calc(100svh-1rem)] w-[22rem] flex-col overflow-hidden rounded-xl border">
          {open && <NotesPanelContent heading={<h2 className="flex-1 truncate text-sm font-semibold">Notatki</h2>} onClose={() => setOpen(false)} />}
        </div>
      </aside>

      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="right" className="w-[22rem] max-w-[calc(100vw-2.5rem)] gap-0 p-0 md:hidden">
          <SheetDescription className="sr-only">Prywatne notatki widoczne tylko dla Ciebie</SheetDescription>
          <NotesPanelContent heading={<SheetTitle className="flex-1 truncate text-sm font-semibold">Notatki</SheetTitle>} />
        </SheetContent>
      </Sheet>
    </>
  )
}

/** `onClose` — przycisk ukrycia w nagłówku (na telefonie zamyka Sheet z własnym „X”). */
function NotesPanelContent({ heading, onClose }: { heading: React.ReactNode; onClose?: () => void }) {
  const { visible, selectedNoteId, setSelectedNoteId } = useNotesPanel()
  const list = useNotesList(visible)
  const actions = useNotesActions()
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [creatingNote, setCreatingNote] = useState(false)

  async function createNote(groupId: string | null) {
    if (creatingNote) return
    setCreatingNote(true)
    try {
      const note = await actions.createNote(groupId)
      setSelectedNoteId(note.id)
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Nie udało się utworzyć notatki")
    } finally {
      setCreatingNote(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("flex h-12 shrink-0 items-center gap-1 border-b pl-3", onClose ? "pr-2" : "pr-14")}>
        <NotebookPen className="mr-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
        {heading}
        {!selectedNoteId && (
          <>
            <HeaderAction label="Nowa grupa" onClick={() => setCreatingGroup(true)}>
              <FolderPlus className="size-4" />
            </HeaderAction>
            <HeaderAction label="Nowa notatka" onClick={() => void createNote(null)} disabled={creatingNote}>
              <Plus className="size-4" />
            </HeaderAction>
          </>
        )}
        {onClose && (
          <HeaderAction label="Ukryj notatki" onClick={onClose}>
            <PanelRightClose className="size-4" />
          </HeaderAction>
        )}
      </div>

      {selectedNoteId ? (
        <NoteEditor noteId={selectedNoteId} groups={list.data?.groups ?? []} onBack={() => setSelectedNoteId(null)} />
      ) : (
        <NotesList
          data={list.data}
          isPending={list.isPending}
          isError={list.isError}
          onRetry={() => void list.refetch()}
          onOpenNote={setSelectedNoteId}
          onCreateNote={(groupId) => void createNote(groupId)}
          creatingGroup={creatingGroup}
          onCreatingGroupChange={setCreatingGroup}
        />
      )}
    </div>
  )
}

function HeaderAction({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
