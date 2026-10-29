"use client";

import { Loader2, LockOpen, StickyNote } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateClientNotesAction } from "@/server/actions/clients";

/**
 * Notatki ogólne (rozdział 4.3): NIE są objęte szyfrowaniem end-to-end i są wyraźnie
 * odróżnione w interfejsie od bezpiecznych notatek w sejfie.
 */
export function NotesEditor({ clientId, initial, canEdit }: { clientId: string; initial: string; canEdit: boolean }) {
  const [notes, setNotes] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = notes !== initial;
  async function save() {
    setBusy(true);
    const r = await updateClientNotesAction(clientId, notes);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success("Zapisano notatki");
  }
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100" role="note">
        <LockOpen className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong>Notatki ogólne nie są szyfrowane end-to-end</strong> — serwer może je odczytać (np. do wyszukiwania). Nie wpisuj tu haseł, kodów ani danych poufnych. Do tego służy{" "}
          <Link href={`/dashboard/clients/${clientId}/credentials?new=secure_note`} className="inline-flex items-center gap-1 font-medium underline">
            <StickyNote className="size-3.5" aria-hidden /> bezpieczna notatka w sejfie
          </Link>
          .
        </p>
      </div>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={18} readOnly={!canEdit} aria-label="Notatki ogólne o kliencie" placeholder="Ustalenia, historia współpracy, preferencje klienta…" />
      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Zapisz notatki
          </Button>
        </div>
      ) : null}
    </div>
  );
}
