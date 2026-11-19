"use client"

import { AlertCircle, ArrowLeft, Check, Loader2, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { NoteDto, NoteGroupDto } from "@/lib/notes/types"
import { useNote, useNotesActions } from "./use-notes"

const SAVE_DELAY_MS = 800
const NO_GROUP = "__none__"

/** Tiptap zamienia pustą treść na pusty akapit — to nie jest zmiana do zapisania. */
const isEmptyDoc = (html: string) => html === "" || html === "<p></p>"

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback)

export function NoteEditor({ noteId, groups, onBack }: { noteId: string; groups: NoteGroupDto[]; onBack: () => void }) {
  const { data: note, isPending, isError } = useNote(noteId)

  if (isPending) {
    return (
      <div className="space-y-3 p-3" aria-busy="true">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (isError || !note) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <p>Nie udało się otworzyć notatki — mogła zostać usunięta.</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Wróć do listy
        </Button>
      </div>
    )
  }
  // Klucz montuje edytor od nowa dla każdej notatki — stan lokalny nie przecieka między nimi.
  return <NoteEditorForm key={note.id} note={note} groups={groups} onBack={onBack} />
}

type SaveStatus = "saved" | "pending" | "error"
type Patch = { title?: string; content?: string }

function NoteEditorForm({ note, groups, onBack }: { note: NoteDto; groups: NoteGroupDto[]; onBack: () => void }) {
  const { updateNote, deleteNote } = useNotesActions()
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [groupId, setGroupId] = useState<string | null>(note.groupId)
  const [status, setStatus] = useState<SaveStatus>("saved")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const pending = useRef<Patch>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Zapisy idą po kolei, żeby starsza odpowiedź nie nadpisała nowszej.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const lastContent = useRef(note.content)
  const deleted = useRef(false)

  const enqueue = useCallback((task: () => Promise<unknown>) => {
    queue.current = queue.current.then(task, task)
    return queue.current
  }, [])

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const patch = pending.current
    if (deleted.current || (patch.title === undefined && patch.content === undefined)) return
    pending.current = {}
    setStatus("pending")
    void enqueue(() =>
      updateNote(note.id, patch).then(
        () => {
          const more = pending.current.title !== undefined || pending.current.content !== undefined
          if (!more) setStatus("saved")
        },
        (error: unknown) => {
          // Niezapisane zmiany wracają do kolejki — „Ponów” wyśle je jeszcze raz.
          pending.current = { ...patch, ...pending.current }
          setStatus("error")
          toast.error(errorMessage(error, "Nie udało się zapisać notatki"))
        }
      )
    )
  }, [enqueue, note.id, updateNote])

  const schedule = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch }
      setStatus("pending")
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DELAY_MS)
    },
    [flush]
  )

  // Zapisz zaległe zmiany przy zamknięciu notatki/panelu i gdy karta przechodzi w tło.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush()
    document.addEventListener("visibilitychange", onHide)
    return () => {
      document.removeEventListener("visibilitychange", onHide)
      flush()
    }
  }, [flush])

  function onContentChange(html: string) {
    setContent(html)
    if (html === lastContent.current || (isEmptyDoc(html) && isEmptyDoc(lastContent.current))) return
    lastContent.current = html
    schedule({ content: html })
  }

  function onGroupChange(value: string) {
    const next = value === NO_GROUP ? null : value
    const previous = groupId
    setGroupId(next)
    void enqueue(() =>
      updateNote(note.id, { groupId: next }).catch((error: unknown) => {
        setGroupId(previous)
        toast.error(errorMessage(error, "Nie udało się przenieść notatki"))
      })
    )
  }

  function back() {
    flush()
    onBack()
  }

  async function remove() {
    deleted.current = true
    if (timer.current) clearTimeout(timer.current)
    pending.current = {}
    try {
      await deleteNote(note.id)
      toast.success("Usunięto notatkę")
      onBack()
    } catch (error) {
      deleted.current = false
      toast.error(errorMessage(error, "Nie udało się usunąć notatki"))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={back} aria-label="Wróć do listy notatek">
              <ArrowLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Wróć do listy</TooltipContent>
        </Tooltip>
        <Select value={groupId ?? NO_GROUP} onValueChange={onGroupChange}>
          <SelectTrigger size="sm" className="h-8 min-w-0 flex-1" aria-label="Grupa notatki">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_GROUP}>Bez grupy</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SaveIndicator status={status} onRetry={flush} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              aria-label="Usuń notatkę"
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Usuń notatkę</TooltipContent>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            schedule({ title: e.target.value })
          }}
          placeholder="Tytuł"
          aria-label="Tytuł notatki"
          maxLength={200}
          className="h-auto border-0 bg-transparent px-1 text-base font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {/* Globalny styl .ProseMirror jest poza warstwami Tailwinda, więc wysokość wymaga „!”.
            Plugin typography nie jest wczytany — znaczniki list przywracamy tutaj. */}
        <div className="[&_.ProseMirror]:min-h-64! [&_ol]:list-decimal [&_ul]:list-disc">
          <RichTextEditor content={content} onChange={onContentChange} placeholder="Zacznij pisać…" />
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć notatkę?</AlertDialogTitle>
            <AlertDialogDescription>
              Notatka „{title.trim() || "Bez tytułu"}” zostanie usunięta na stałe. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={() => void remove()}>
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "error") {
    return (
      <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1 px-2 text-xs text-destructive" onClick={onRetry}>
        <AlertCircle className="size-3.5" aria-hidden /> Ponów
      </Button>
    )
  }
  return (
    <span className="flex shrink-0 items-center gap-1 px-1 text-xs text-muted-foreground" aria-live="polite">
      {status === "pending" ? (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Zapisywanie…
        </>
      ) : (
        <>
          <Check className="size-3.5" aria-hidden /> Zapisano
        </>
      )}
    </span>
  )
}
