"use client"

import { ChevronRight, Ellipsis, Folder, FolderPlus, Pencil, Plus, Search, StickyNote, Trash2 } from "lucide-react"
import { useMemo, useRef, useState } from "react"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelative } from "@/lib/format"
import type { NoteGroupDto, NoteSummaryDto, NotesListResponse } from "@/lib/notes/types"
import { NOTE_GROUP_NAME_MAX_LENGTH } from "@/lib/notes/validation"
import { cn } from "@/lib/utils"
import { useNotesPanel } from "./notes-panel-provider"
import { useNotesActions } from "./use-notes"

const UNGROUPED = "__ungrouped__"

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback)
const normalize = (s: string) => s.toLocaleLowerCase("pl")

type Props = {
  data: NotesListResponse | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
  onOpenNote: (id: string) => void
  onCreateNote: (groupId: string | null) => void
  creatingGroup: boolean
  onCreatingGroupChange: (value: boolean) => void
}

export function NotesList({ data, isPending, isError, onRetry, onOpenNote, onCreateNote, creatingGroup, onCreatingGroupChange }: Props) {
  const { collapsedGroups, toggleGroup } = useNotesPanel()
  const actions = useNotesActions()
  const [query, setQuery] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<NoteGroupDto | null>(null)

  const groups = useMemo(() => data?.groups ?? [], [data])
  const notes = useMemo(() => data?.notes ?? [], [data])
  const q = normalize(query.trim())
  const searching = q.length > 0

  // Notatki pogrupowane; wpis wskazujący nieistniejącą grupę trafia do „Bez grupy”.
  const byGroup = useMemo(() => {
    const ids = new Set(groups.map((g) => g.id))
    const map = new Map<string, NoteSummaryDto[]>()
    for (const n of notes) {
      if (q && !normalize(n.title).includes(q) && !normalize(n.excerpt).includes(q)) continue
      const key = n.groupId && ids.has(n.groupId) ? n.groupId : UNGROUPED
      const list = map.get(key)
      if (list) list.push(n)
      else map.set(key, [n])
    }
    return map
  }, [groups, notes, q])

  const countIn = (groupId: string) => notes.filter((n) => n.groupId === groupId).length

  async function createGroup(name: string) {
    try {
      await actions.createGroup(name)
      onCreatingGroupChange(false)
      return true
    } catch (error) {
      toast.error(errorMessage(error, "Nie udało się utworzyć grupy"))
      return false
    }
  }

  async function renameGroup(id: string, name: string) {
    try {
      await actions.renameGroup(id, name)
      setRenamingId(null)
      return true
    } catch (error) {
      toast.error(errorMessage(error, "Nie udało się zmienić nazwy grupy"))
      return false
    }
  }

  async function deleteGroup(group: NoteGroupDto) {
    try {
      await actions.deleteGroup(group.id)
      toast.success(`Usunięto grupę „${group.name}”`)
    } catch (error) {
      toast.error(errorMessage(error, "Nie udało się usunąć grupy"))
    }
  }

  if (isPending) {
    return (
      <div className="space-y-2 p-3" aria-busy="true">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <p>Nie udało się wczytać notatek.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      </div>
    )
  }

  const ungrouped = byGroup.get(UNGROUPED) ?? []
  const empty = notes.length === 0 && groups.length === 0
  const noResults = searching && byGroup.size === 0

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {notes.length > 0 && (
        <div className="sticky top-0 z-10 border-b bg-background/80 p-2 backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder="Szukaj w notatkach…"
              aria-label="Szukaj w notatkach"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
      )}

      <div className="space-y-0.5 p-2">
        {creatingGroup && (
          <GroupNameForm
            placeholder="Nazwa nowej grupy"
            onSubmit={createGroup}
            onCancel={() => onCreatingGroupChange(false)}
          />
        )}

        {empty && !creatingGroup && (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <StickyNote className="size-8 text-muted-foreground/60" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium">Brak notatek</p>
              <p className="text-xs text-muted-foreground">Notatki są prywatne — widzisz je tylko Ty. Pogrupuj je w foldery.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => onCreateNote(null)}>
                <Plus aria-hidden /> Nowa notatka
              </Button>
              <Button size="sm" variant="outline" onClick={() => onCreatingGroupChange(true)}>
                <FolderPlus aria-hidden /> Nowa grupa
              </Button>
            </div>
          </div>
        )}

        {noResults && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Brak notatek pasujących do „{query.trim()}”.</p>}

        {groups.map((group) => {
          const groupNotes = byGroup.get(group.id) ?? []
          if (searching && groupNotes.length === 0) return null
          const expanded = searching || !collapsedGroups.has(group.id)
          return (
            <section key={group.id} aria-label={`Grupa ${group.name}`}>
              {renamingId === group.id ? (
                <GroupNameForm
                  initial={group.name}
                  placeholder="Nazwa grupy"
                  onSubmit={(name) => renameGroup(group.id, name)}
                  onCancel={() => setRenamingId(null)}
                />
              ) : (
                <div className="group/row flex items-center gap-0.5 rounded-md pr-0.5 hover:bg-accent/60">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1.5 pl-1.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:py-2.5"
                  >
                    <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} aria-hidden />
                    <Folder className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{group.name}</span>
                    <span className="ml-auto pr-1 text-xs font-normal text-muted-foreground tabular-nums">{countIn(group.id)}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground"
                    onClick={() => onCreateNote(group.id)}
                    aria-label={`Nowa notatka w grupie ${group.name}`}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" aria-label={`Opcje grupy ${group.name}`}>
                        <Ellipsis className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    {/* Bez powrotu fokusu na przycisk — inaczej pole zmiany nazwy od razu traci fokus. */}
                    <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                      <DropdownMenuItem onSelect={() => onCreateNote(group.id)}>
                        <Plus /> Nowa notatka w grupie
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setRenamingId(group.id)}>
                        <Pencil /> Zmień nazwę
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeletingGroup(group)}>
                        <Trash2 /> Usuń grupę
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {expanded && (
                <div className="ml-3 border-l pl-1.5">
                  {groupNotes.length ? (
                    <NoteRows notes={groupNotes} onOpenNote={onOpenNote} />
                  ) : (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">Pusta grupa</p>
                  )}
                </div>
              )}
            </section>
          )
        })}

        {ungrouped.length > 0 &&
          (groups.length === 0 ? (
            <NoteRows notes={ungrouped} onOpenNote={onOpenNote} />
          ) : (
            <section aria-label="Bez grupy" className="pt-1">
              <button
                type="button"
                onClick={() => toggleGroup(UNGROUPED)}
                aria-expanded={searching || !collapsedGroups.has(UNGROUPED)}
                className="flex w-full items-center gap-1.5 rounded-md py-1.5 pl-1.5 text-left text-sm font-medium text-muted-foreground outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:py-2.5"
              >
                <ChevronRight
                  className={cn("size-3.5 shrink-0 transition-transform", (searching || !collapsedGroups.has(UNGROUPED)) && "rotate-90")}
                  aria-hidden
                />
                <span>Bez grupy</span>
                <span className="ml-auto pr-1.5 text-xs font-normal tabular-nums">{ungrouped.length}</span>
              </button>
              {(searching || !collapsedGroups.has(UNGROUPED)) && (
                <div className="ml-3 border-l pl-1.5">
                  <NoteRows notes={ungrouped} onOpenNote={onOpenNote} />
                </div>
              )}
            </section>
          ))}
      </div>

      <AlertDialog open={deletingGroup !== null} onOpenChange={(o) => !o && setDeletingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć grupę „{deletingGroup?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingGroup && countIn(deletingGroup.id) > 0
                ? `Notatki z tej grupy (${countIn(deletingGroup.id)}) nie zostaną usunięte — trafią do „Bez grupy”.`
                : "Grupa jest pusta."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => deletingGroup && void deleteGroup(deletingGroup)}
            >
              Usuń grupę
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function NoteRows({ notes, onOpenNote }: { notes: NoteSummaryDto[]; onOpenNote: (id: string) => void }) {
  return (
    <ul className="space-y-0.5">
      {notes.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => onOpenNote(n.id)}
            className="block w-full rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:py-2.5"
          >
            <span className="flex items-baseline gap-2">
              <span className={cn("min-w-0 flex-1 truncate text-sm", !n.title && "text-muted-foreground italic")}>{n.title || "Bez tytułu"}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(n.updatedAt)}</span>
            </span>
            {n.excerpt && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.excerpt}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

function GroupNameForm({
  initial = "",
  placeholder,
  onSubmit,
  onCancel,
}: {
  initial?: string
  placeholder: string
  onSubmit: (name: string) => Promise<boolean>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  // Enter, Esc i utrata fokusu mogą przyjść jedno po drugim — zatwierdzamy tylko raz.
  const settled = useRef(false)

  function cancel() {
    settled.current = true
    onCancel()
  }

  async function submit() {
    if (settled.current) return
    const trimmed = name.trim()
    if (!trimmed || trimmed === initial) return cancel()
    settled.current = true
    setBusy(true)
    const ok = await onSubmit(trimmed)
    if (!ok) {
      settled.current = false
      setBusy(false)
    }
  }

  return (
    <form
      className="flex items-center gap-1.5 py-0.5 pl-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Folder className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && cancel()}
        onBlur={() => void submit()}
        readOnly={busy}
        maxLength={NOTE_GROUP_NAME_MAX_LENGTH}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 text-sm"
      />
    </form>
  )
}
