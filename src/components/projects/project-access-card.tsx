"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, Key, Loader2, Lock, Plus, ShieldCheck, Vault } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TypeIcon } from "@/components/vault/category"
import { useSession } from "@/lib/auth/use-session"
import { hasVaultKey, saveCredential, useVault } from "@/lib/vault/store"
import { emptyOverview, emptySecrets } from "@/lib/vault/types"

export type LegacyCredential = { id: string; name: string; content: string }

/** Dawne dane dostępowe projektu: JSON z listą `{ id, name, content }` (treść w HTML z edytora). */
export function parseLegacyCredentials(raw: string | null | undefined): LegacyCredential[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((c) => c && typeof c.name === "string" && typeof c.content === "string")
    if (parsed?.name && parsed?.content) return [{ id: "legacy", name: parsed.name, content: parsed.content }]
  } catch {
    // nieczytelny zapis — traktujemy jak brak danych
  }
  return []
}

/** Treść z edytora jako czysty tekst — bez wstrzykiwania HTML do strony z odszyfrowanym sejfem. */
function htmlToText(html: string): string {
  const withBreaks = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6]|pre|blockquote|tr)>/gi, "\n")
  const doc = new DOMParser().parseFromString(withBreaks, "text/html")
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim()
}

interface ProjectAccessCardProps {
  projectId: string
  projectName: string
  client: { id: string; name: string } | null
  legacyRaw: string | null | undefined
  onLegacyCleared: () => void
}

/**
 * Dane dostępowe projektu pochodzą z sejfu klienta (szyfrowanie end-to-end). Dawne, jawne
 * dane dostępowe projektu można jednym kliknięciem przenieść do sejfu jako bezpieczne notatki.
 */
export function ProjectAccessCard({ projectId, projectName, client, legacyRaw, onLegacyCleared }: ProjectAccessCardProps) {
  const { data: session } = useSession()
  const status = useVault((s) => s.status)
  const vaultClient = useVault((s) => (client ? s.clients.find((c) => c.id === client.id) : undefined))
  const allItems = useVault((s) => s.items)
  const items = useMemo(() => (client ? allItems.filter((i) => i.clientId === client.id) : []), [allItems, client])
  const legacy = useMemo(() => parseLegacyCredentials(legacyRaw), [legacyRaw])
  const [shown, setShown] = useState<Record<string, boolean>>({})
  const [migrating, setMigrating] = useState(false)

  const crmAllowed = session?.user.role !== "manager"
  const unlocked = status === "unlocked"
  const unlockHref = `/auth/unlock?next=${encodeURIComponent(`/dashboard/projects/${projectId}/info`)}`
  const canMigrate = Boolean(client && unlocked && vaultClient?.canEdit && hasVaultKey(client.id))

  async function migrateLegacy() {
    if (!client) return
    setMigrating(true)
    try {
      for (const entry of legacy) {
        await saveCredential({
          clientId: client.id,
          type: "secure_note",
          sensitivity: "standard",
          overview: { ...emptyOverview("secure_note"), name: `${projectName}: ${entry.name}`, tags: ["projekt"] },
          secrets: { ...emptySecrets("secure_note"), fields: { content: htmlToText(entry.content) } },
        })
      }
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: null }),
      })
      if (!res.ok) throw new Error("Wpisy są już w sejfie, ale nie udało się usunąć jawnej kopii z projektu")
      toast.success(`Przeniesiono ${legacy.length} ${legacy.length === 1 ? "wpis" : "wpisów"} do sejfu klienta ${client.name}`)
      onLegacyCleared()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się przenieść danych dostępowych")
    } finally {
      setMigrating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Key className="size-4 text-muted-foreground" />
          <span>Dane dostępowe</span>
        </CardTitle>
        <CardDescription>
          {client ? <>Dostępy klienta {client.name} z sejfu szyfrowanego end-to-end</> : "Przypisz klienta do projektu, aby korzystać z jego sejfu dostępów"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {client && crmAllowed && (
          !unlocked ? (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-4 shrink-0" /> Sejf jest zablokowany — odblokuj go, aby zobaczyć dostępy klienta.
              </p>
              <Button asChild size="sm">
                <Link href={unlockHref}>Odblokuj sejf</Link>
              </Button>
            </div>
          ) : !vaultClient ? (
            <p className="text-sm text-muted-foreground">Nie masz dostępu do sejfu klienta {client.name}. Poproś opiekuna klienta o przypisanie.</p>
          ) : !hasVaultKey(client.id) ? (
            <p className="text-sm text-muted-foreground">Klucz sejfu tego klienta nie jest jeszcze dostępny — zostanie nadany, gdy administrator odblokuje sejf.</p>
          ) : (
            <div className="space-y-2">
              {items.length ? (
                <ul className="divide-y rounded-lg border">
                  {items.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/dashboard/clients/${client.id}/credentials?open=${item.id}`}
                        className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        <TypeIcon type={item.type} className="size-7" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.overview?.name ?? "Wpis"}</span>
                          {item.overview?.login ? <span className="block truncate text-xs text-muted-foreground">{item.overview.login}</span> : null}
                        </span>
                        {item.sensitivity === "critical" ? <ShieldCheck className="size-4 text-amber-600" aria-label="Wpis krytyczny" /> : null}
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sejf klienta nie ma jeszcze żadnych dostępów.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/clients/${client.id}/credentials`}>
                    <Vault className="size-4" /> {items.length > 8 ? `Wszystkie dostępy (${items.length})` : "Otwórz sejf klienta"}
                  </Link>
                </Button>
                {vaultClient.canEdit && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/clients/${client.id}/credentials?new=website`}>
                      <Plus className="size-4" /> Dodaj dostęp
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )
        )}

        {legacy.length > 0 && (
          <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                <span className="font-medium">Jawne dane dostępowe projektu ({legacy.length})</span>
                <span className="block text-xs text-muted-foreground">Zapisane bez szyfrowania end-to-end. Przenieś je do sejfu klienta — kopia w projekcie zostanie usunięta.</span>
              </p>
              {canMigrate ? (
                <Button size="sm" onClick={migrateLegacy} disabled={migrating}>
                  {migrating ? <Loader2 className="size-4 animate-spin" /> : <Vault className="size-4" />} Przenieś do sejfu
                </Button>
              ) : null}
            </div>
            <ul className="space-y-2">
              {legacy.map((entry) => (
                <li key={entry.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium">{entry.name}</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShown((s) => ({ ...s, [entry.id]: !s[entry.id] }))}>
                      {shown[entry.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      {shown[entry.id] ? "Ukryj" : "Pokaż"}
                    </Button>
                  </div>
                  {shown[entry.id] ? <pre className="secret mt-2 text-sm whitespace-pre-wrap">{htmlToText(entry.content)}</pre> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!client && legacy.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Brak danych dostępowych. Połącz projekt z klientem w edycji projektu — dostępy będą wtedy przechowywane w sejfie klienta.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
