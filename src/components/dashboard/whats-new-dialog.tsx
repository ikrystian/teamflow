"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SafeHtml } from "@/components/ui/safe-html"
import type { ChangelogEntryDto } from "@/lib/changelog-shared"

type WhatsNewEntry = Pick<ChangelogEntryDto, "id" | "title" | "content" | "publishedAt">

interface WhatsNewDialogProps {
  /** Nieprzeczytane wpisy, najnowsze pierwsze. */
  entries: WhatsNewEntry[]
  /** Podgląd z ustawień: sterowany z zewnątrz i bez oznaczania wpisów jako widziane. */
  preview?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const formatEntryDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }) : "Szkic"

/**
 * Popup „Co nowego” na dashboardzie. Pokazuje się raz: zaraz po wyświetleniu zapisuje,
 * że użytkownik widział wpisy do najnowszego włącznie, więc odświeżenie strony go nie przywróci.
 */
export function WhatsNewDialog({ entries, preview = false, open: controlledOpen, onOpenChange }: WhatsNewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(entries.length > 0)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const newestId = entries[0]?.id

  useEffect(() => {
    if (preview || !newestId) return
    fetch("/api/changelog/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: newestId }),
      keepalive: true,
    }).catch(() => {
      // Bez sieci popup pokaże się ponownie przy następnej wizycie — nic więcej do zrobienia.
    })
  }, [preview, newestId])

  if (entries.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-6 sm:max-w-2xl">
        <DialogHeader className="items-center text-center sm:items-start sm:text-left">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[var(--glass-edge)]">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <DialogTitle className="font-display text-2xl font-normal">Co nowego w Nexusie</DialogTitle>
          <DialogDescription>
            {preview
              ? "Podgląd — tak wpis zobaczą użytkownicy po wejściu na dashboard."
              : entries.length === 1
                ? "Mamy dla Ciebie nowość od ostatniej wizyty."
                : `Mamy dla Ciebie ${entries.length} nowości od ostatniej wizyty.`}
          </DialogDescription>
        </DialogHeader>

        <ol className="min-w-0 space-y-6">
          {entries.map((entry, i) => (
            <li key={entry.id} className={i > 0 ? "border-t pt-6" : undefined}>
              <p className="kicker text-muted-foreground">{formatEntryDate(entry.publishedAt)}</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">{entry.title}</h3>
              <SafeHtml
                html={entry.content}
                className="rich-text mt-3 text-sm leading-relaxed break-words text-foreground"
              />
            </li>
          ))}
        </ol>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Rozumiem</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
