"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS: [string, string][] = [
  ["Ctrl / ⌘ + K", "Paleta poleceń (projekty, klienci, dostępy, akcje)"],
  ["Ctrl / ⌘ + K na tablicy projektu", "Szybkie dodawanie zadania"],
  ["/", "Paleta poleceń (działa wszędzie)"],
  ["Ctrl / ⌘ + Shift + L", "Zablokuj sejf"],
  ["Ctrl / ⌘ + B", "Pokaż / ukryj menu boczne"],
  ["?", "Ta ściąga"],
  ["↑ / ↓ lub J / K", "Poprzedni / następny dostęp na liście"],
  ["L", "Kopiuj login zaznaczonego dostępu"],
  ["P", "Kopiuj hasło zaznaczonego dostępu"],
  ["T", "Kopiuj kod 2FA"],
  ["O", "Otwórz adres w nowej karcie"],
  ["Enter", "Szczegóły dostępu"],
  ["N", "Dodaj dostęp (na liście dostępów)"],
  ["Esc", "Zamknij panel"],
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skróty klawiaturowe</DialogTitle>
          <DialogDescription>Najczęstsze akcje bez myszy.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
              </dt>
              <dd className="text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
