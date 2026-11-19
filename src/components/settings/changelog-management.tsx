"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, Loader2, Megaphone, Pencil, Plus, Sparkles, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { WhatsNewDialog } from "@/components/dashboard/whats-new-dialog"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { ChangelogEntryDto } from "@/lib/changelog-shared"
import { formatDate } from "@/lib/format"

type PreviewEntry = Pick<ChangelogEntryDto, "id" | "title" | "content" | "publishedAt">
type Confirm = { kind: "publish" | "delete"; entry: ChangelogEntryDto }

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null)
  return (data && typeof data.error === "string" && data.error) || fallback
}

async function requestEntries(): Promise<ChangelogEntryDto[]> {
  const response = await fetch("/api/admin/changelog")
  if (!response.ok) throw new Error(await readError(response, "Nie udało się pobrać wpisów"))
  return (await response.json()).entries
}

async function uploadImage(file: File): Promise<string> {
  const body = new FormData()
  body.append("file", file)
  const response = await fetch("/api/admin/changelog/images", { method: "POST", body })
  if (!response.ok) {
    const message = await readError(response, "Nie udało się przesłać obrazka")
    toast.error(message)
    throw new Error(message)
  }
  return (await response.json()).url
}

/** Ustawienia → Changelog (tylko admin): wpisy pokazywane użytkownikom w popupie „Co nowego”. */
export function ChangelogManagement() {
  const [entries, setEntries] = useState<ChangelogEntryDto[]>([])
  const [loading, setLoading] = useState(true)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ChangelogEntryDto | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null)

  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewEntry | null>(null)

  const fetchEntries = useCallback(async () => {
    try {
      setEntries(await requestEntries())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się pobrać wpisów")
    }
  }, [])

  useEffect(() => {
    requestEntries()
      .then(setEntries, (error) => toast.error(error instanceof Error ? error.message : "Nie udało się pobrać wpisów"))
      .finally(() => setLoading(false))
  }, [])

  const openEditor = (entry: ChangelogEntryDto | null) => {
    setEditing(entry)
    setTitle(entry?.title ?? "")
    setContent(entry?.content ?? "")
    setEditorOpen(true)
  }

  const save = async (publish: boolean) => {
    if (!title.trim()) {
      toast.error("Podaj tytuł wpisu")
      return
    }
    setSaving(publish ? "publish" : "draft")
    try {
      const response = editing
        ? await fetch(`/api/admin/changelog/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim(), content, ...(publish ? { published: true } : {}) }),
          })
        : await fetch("/api/admin/changelog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim(), content, publish }),
          })
      if (!response.ok) throw new Error(await readError(response, "Nie udało się zapisać wpisu"))
      toast.success(publish && !editing?.publishedAt ? "Wpis opublikowany" : "Wpis zapisany")
      setEditorOpen(false)
      await fetchEntries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać wpisu")
    } finally {
      setSaving(null)
    }
  }

  const setPublished = async (entry: ChangelogEntryDto, published: boolean) => {
    setBusyId(entry.id)
    try {
      const response = await fetch(`/api/admin/changelog/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      })
      if (!response.ok) throw new Error(await readError(response, "Nie udało się zmienić statusu wpisu"))
      toast.success(published ? "Wpis opublikowany" : "Publikacja cofnięta — wpis jest szkicem")
      await fetchEntries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zmienić statusu wpisu")
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (entry: ChangelogEntryDto) => {
    setBusyId(entry.id)
    try {
      const response = await fetch(`/api/admin/changelog/${entry.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error(await readError(response, "Nie udało się usunąć wpisu"))
      toast.success("Wpis usunięty")
      await fetchEntries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się usunąć wpisu")
    } finally {
      setBusyId(null)
    }
  }

  const runConfirm = () => {
    if (!confirm) return
    if (confirm.kind === "publish") void setPublished(confirm.entry, true)
    else void remove(confirm.entry)
    setConfirm(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>
                <Sparkles className="h-5 w-5" />
                Changelog
              </CardTitle>
              <CardDescription>
                Opublikowane wpisy każdy użytkownik zobaczy raz — w okienku „Co nowego” po wejściu na dashboard.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => openEditor(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nowy wpis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ładowanie wpisów...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>Brak wpisów. Dodaj pierwszy, żeby poinformować zespół o nowościach.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => {
                const busy = busyId === entry.id
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{entry.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {entry.publishedAt ? (
                          <Badge>Opublikowany</Badge>
                        ) : (
                          <Badge variant="secondary">Szkic</Badge>
                        )}
                        <span>
                          {entry.publishedAt
                            ? formatDate(entry.publishedAt)
                            : `Edytowany ${formatDate(entry.updatedAt)}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin text-muted-foreground" />}
                      <Button variant="ghost" size="sm" aria-label="Podgląd" title="Podgląd" onClick={() => setPreview(entry)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Edytuj" title="Edytuj" onClick={() => openEditor(entry)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {entry.publishedAt ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Cofnij publikację"
                          title="Cofnij publikację"
                          disabled={busy}
                          onClick={() => setPublished(entry, false)}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Opublikuj"
                          title="Opublikuj"
                          disabled={busy}
                          onClick={() => setConfirm({ kind: "publish", entry })}
                        >
                          <Megaphone className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Usuń"
                        title="Usuń"
                        disabled={busy}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirm({ kind: "delete", entry })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={(open) => !saving && setEditorOpen(open)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edytuj wpis" : "Nowy wpis"}</DialogTitle>
            <DialogDescription>
              {editing?.publishedAt
                ? "Wpis jest opublikowany — zmiany zobaczą osoby, które jeszcze go nie widziały."
                : "Zapisz jako szkic, żeby wrócić do niego później, albo opublikuj od razu."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="changelog-title">Tytuł</Label>
              <Input
                id="changelog-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Notatki w panelu bocznym"
                maxLength={200}
              />
            </div>
            <div className="rich-text space-y-2">
              <Label>Treść</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Opisz, co się zmieniło i jak z tego skorzystać…"
                onImageUpload={uploadImage}
                extended
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              onClick={() =>
                setPreview({ id: editing?.id ?? "preview", title: title.trim() || "Bez tytułu", content, publishedAt: editing?.publishedAt ?? null })
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              Podgląd
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={!!saving}>
                Anuluj
              </Button>
              <Button variant={editing?.publishedAt ? "default" : "outline"} onClick={() => save(false)} disabled={!!saving}>
                {saving === "draft" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing?.publishedAt ? "Zapisz zmiany" : "Zapisz szkic"}
              </Button>
              {!editing?.publishedAt && (
                <Button onClick={() => save(true)} disabled={!!saving}>
                  {saving === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
                  Zapisz i opublikuj
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === "publish" ? "Opublikować wpis?" : "Usunąć wpis?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "publish"
                ? `„${confirm.entry.title}” pojawi się każdemu użytkownikowi przy następnym wejściu na dashboard.`
                : `„${confirm?.entry.title}” zniknie z changelogu. Tej operacji nie można cofnąć.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirm}
              className={confirm?.kind === "delete" ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
            >
              {confirm?.kind === "publish" ? "Opublikuj" : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WhatsNewDialog
        preview
        entries={preview ? [preview] : []}
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
      />
    </div>
  )
}
