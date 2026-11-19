"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Copy, Download, Eye, EyeOff, FileKey, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { copySecret } from "@/lib/vault/clipboard"
import { ENV_CONTENT_MAX_LENGTH, envFileNameSchema } from "@/lib/project-env/validation"

type EnvFileMeta = {
  id: string
  name: string
  varCount: number
  updatedAt: string
  updatedBy?: { id: string; name: string } | null
}

type DialogState = { mode: "create" } | { mode: "edit"; file: EnvFileMeta; content: string }

const NAME_PRESETS = [".env", ".env.local", ".env.development", ".env.production"]

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  return typeof body?.error === "string" ? body.error : fallback
}

type ListResult = { kind: "ok"; files: EnvFileMeta[] } | { kind: "denied" } | { kind: "error"; message: string }

async function fetchList(url: string): Promise<ListResult> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (res.status === 404 || res.status === 401) return { kind: "denied" }
    if (!res.ok) return { kind: "error", message: await readError(res, "Nie udało się pobrać plików .env") }
    const data = (await res.json()) as { files: EnvFileMeta[] }
    return { kind: "ok", files: data.files }
  } catch {
    return { kind: "error", message: "Nie udało się pobrać plików .env" }
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pl-PL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/**
 * Pliki .env projektu. Treść jest szyfrowana na serwerze, a lista nie zawiera sekretów —
 * odszyfrowany tekst pobieramy dopiero na żądanie (Pokaż, Kopiuj, Pobierz, Edytuj)
 * i trzymamy tylko w pamięci karty.
 */
export function ProjectEnvCard({ projectId }: { projectId: string }) {
  const base = `/api/projects/${projectId}/env`
  const [files, setFiles] = useState<EnvFileMeta[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [shown, setShown] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EnvFileMeta | null>(null)

  const applyList = useCallback((result: ListResult) => {
    if (result.kind === "ok") {
      setFiles(result.files)
      setLoadError(null)
    } else if (result.kind === "denied") {
      setDenied(true)
      setFiles([])
    } else {
      setLoadError(result.message)
      setFiles((prev) => prev ?? [])
    }
  }, [])

  // Odświeżenie listy po zapisie lub usunięciu.
  const load = useCallback(async () => applyList(await fetchList(base)), [applyList, base])

  useEffect(() => {
    let cancelled = false
    void fetchList(base).then((result) => {
      if (!cancelled) applyList(result)
    })
    return () => {
      cancelled = true
    }
  }, [applyList, base])

  async function fetchContent(file: EnvFileMeta): Promise<string | null> {
    setBusyId(file.id)
    try {
      const res = await fetch(`${base}/${file.id}`, { cache: "no-store" })
      if (!res.ok) throw new Error(await readError(res, "Nie udało się odczytać pliku"))
      const data = (await res.json()) as { file: { content: string } }
      return data.file.content
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się odczytać pliku")
      return null
    } finally {
      setBusyId(null)
    }
  }

  async function contentOf(file: EnvFileMeta) {
    return shown[file.id] ?? (await fetchContent(file))
  }

  async function toggleShow(file: EnvFileMeta) {
    if (file.id in shown) {
      setShown(({ [file.id]: _hidden, ...rest }) => rest)
      return
    }
    const content = await fetchContent(file)
    if (content !== null) setShown((s) => ({ ...s, [file.id]: content }))
  }

  async function copy(file: EnvFileMeta) {
    const content = await contentOf(file)
    if (content === null) return
    try {
      await copySecret(content)
      toast.success(`Skopiowano ${file.name} — schowek zostanie wyczyszczony po 30 s`)
    } catch {
      toast.error("Nie udało się skopiować do schowka")
    }
  }

  async function download(file: EnvFileMeta) {
    const content = await contentOf(file)
    if (content === null) return
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
  }

  async function openEdit(file: EnvFileMeta) {
    const content = await contentOf(file)
    if (content !== null) setDialog({ mode: "edit", file, content })
  }

  async function save(name: string, content: string) {
    setSaving(true)
    try {
      const editing = dialog?.mode === "edit" ? dialog.file : null
      const res = await fetch(editing ? `${base}/${editing.id}` : base, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      })
      if (!res.ok) throw new Error(await readError(res, "Nie udało się zapisać pliku"))
      // Odszyfrowana kopia w pamięci jest już nieaktualna — przy następnym „Pokaż” pobierzemy świeżą.
      if (editing) setShown(({ [editing.id]: _stale, ...rest }) => rest)
      setDialog(null)
      toast.success(editing ? `Zapisano ${name}` : `Dodano ${name}`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać pliku")
    } finally {
      setSaving(false)
    }
  }

  async function remove(file: EnvFileMeta) {
    setBusyId(file.id)
    try {
      const res = await fetch(`${base}/${file.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await readError(res, "Nie udało się usunąć pliku"))
      setShown(({ [file.id]: _removed, ...rest }) => rest)
      toast.success(`Usunięto ${file.name}`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się usunąć pliku")
    } finally {
      setBusyId(null)
      setDeleteTarget(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <FileKey className="size-4 text-muted-foreground" />
          <span>Pliki .env</span>
        </CardTitle>
        <CardDescription>Szyfrowane na serwerze. Widoczne dla twórcy projektu, jego członków i administratorów.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {files === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Ładowanie…
          </p>
        ) : denied ? (
          <p className="text-sm text-muted-foreground">Pliki .env są dostępne tylko dla twórcy projektu, jego członków i administratorów.</p>
        ) : (
          <>
            {loadError && <p className="text-sm text-destructive">{loadError}</p>}
            {files.length ? (
              <ul className="divide-y rounded-lg border">
                {files.map((file) => {
                  const content = shown[file.id]
                  const busy = busyId === file.id
                  return (
                    <li key={file.id} className="space-y-2 px-3 py-2.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.varCount} {file.varCount === 1 ? "zmienna" : "zmiennych"} · {formatDate(file.updatedAt)}
                            {file.updatedBy ? ` · ${file.updatedBy.name}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          <Button variant="ghost" size="icon-sm" className="pointer-coarse:size-10" disabled={busy} onClick={() => toggleShow(file)} aria-label={content !== undefined ? `Ukryj ${file.name}` : `Pokaż ${file.name}`} title={content !== undefined ? "Ukryj" : "Pokaż"}>
                            {busy ? <Loader2 className="animate-spin" /> : content !== undefined ? <EyeOff /> : <Eye />}
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="pointer-coarse:size-10" disabled={busy} onClick={() => copy(file)} aria-label={`Kopiuj ${file.name}`} title="Kopiuj">
                            <Copy />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="pointer-coarse:size-10" disabled={busy} onClick={() => download(file)} aria-label={`Pobierz ${file.name}`} title="Pobierz">
                            <Download />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="pointer-coarse:size-10" disabled={busy} onClick={() => openEdit(file)} aria-label={`Edytuj ${file.name}`} title="Edytuj">
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="pointer-coarse:size-10 text-destructive hover:text-destructive" disabled={busy} onClick={() => setDeleteTarget(file)} aria-label={`Usuń ${file.name}`} title="Usuń">
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      {content !== undefined && (
                        <pre className="secret max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs break-all whitespace-pre-wrap">{content || "(pusty plik)"}</pre>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Ten projekt nie ma jeszcze zapisanych plików .env.</p>
            )}
            <Button variant="outline" size="sm" onClick={() => setDialog({ mode: "create" })}>
              <Plus className="size-4" /> Dodaj plik .env
            </Button>
          </>
        )}
      </CardContent>

      {dialog && (
        <EnvFileDialog
          // Nowy stan formularza przy każdym otwarciu (tworzenie / edycja innego pliku).
          key={dialog.mode === "edit" ? dialog.file.id : "create"}
          state={dialog}
          saving={saving}
          onSave={save}
          onClose={() => !saving && setDialog(null)}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Zaszyfrowana treść pliku zostanie trwale usunięta z projektu. Tej operacji nie można cofnąć.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && remove(deleteTarget)}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function EnvFileDialog({
  state,
  saving,
  onSave,
  onClose,
}: {
  state: DialogState
  saving: boolean
  onSave: (name: string, content: string) => void
  onClose: () => void
}) {
  const editing = state.mode === "edit"
  const [name, setName] = useState(editing ? state.file.name : "")
  const [content, setContent] = useState(editing ? state.content : "")
  const fileInput = useRef<HTMLInputElement>(null)

  const nameCheck = envFileNameSchema.safeParse(name)
  const tooLong = content.length > ENV_CONTENT_MAX_LENGTH
  const canSave = nameCheck.success && !tooLong && !saving

  async function loadFromFile(file: File | undefined) {
    if (!file) return
    if (file.size > ENV_CONTENT_MAX_LENGTH * 4) {
      toast.error("Plik jest za duży na plik .env")
      return
    }
    setContent(await file.text())
    if (!name && envFileNameSchema.safeParse(file.name).success) setName(file.name)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edytuj ${state.file.name}` : "Dodaj plik .env"}</DialogTitle>
          <DialogDescription>Treść zostanie zaszyfrowana na serwerze. Wklej zawartość pliku albo wczytaj go z dysku.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (canSave) onSave(name.trim(), content)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="env-name">Nazwa pliku</Label>
            <Input id="env-name" value={name} onChange={(e) => setName(e.target.value)} placeholder=".env.production" className="font-mono" maxLength={64} autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={name !== "" && !nameCheck.success} />
            {name !== "" && !nameCheck.success ? <p className="text-xs text-destructive">{nameCheck.error.issues[0]?.message}</p> : null}
            {!editing && (
              <div className="flex flex-wrap gap-1.5">
                {NAME_PRESETS.map((preset) => (
                  <Button key={preset} type="button" variant="outline" size="sm" className="font-mono text-xs" onClick={() => setName(preset)}>
                    {preset}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="env-content">Treść</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                <Upload className="size-4" /> Wczytaj z pliku
              </Button>
              <input ref={fileInput} type="file" className="hidden" onChange={(e) => { void loadFromFile(e.target.files?.[0]); e.target.value = "" }} />
            </div>
            <Textarea id="env-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder={"DATABASE_URL=postgres://…\nAPI_KEY=…"} className="secret max-h-[50dvh] min-h-48 text-xs" autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={tooLong} />
            <p className={tooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {content.length.toLocaleString("pl-PL")} / {ENV_CONTENT_MAX_LENGTH.toLocaleString("pl-PL")} znaków
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Anuluj
            </Button>
            <Button type="submit" disabled={!canSave}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null} Zapisz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
