"use client";

import { Download, Printer, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Zestaw ratunkowy: klucz odzyskiwania do wydrukowania (rozdział 4.1). */
export function RecoveryKit({ recoveryKey, email, name }: { recoveryKey: string; email: string; name: string }) {
  const date = new Date().toLocaleDateString("pl-PL");
  function download() {
    const text = [
      "NEXUS — ZESTAW RATUNKOWY SEJFU",
      "",
      `Konto: ${name} <${email}>`,
      `Utworzono: ${date}`,
      "",
      "Klucz odzyskiwania:",
      recoveryKey,
      "",
      "Ten klucz pozwala odzyskać dostęp do sejfu, jeśli zapomnisz hasła głównego.",
      "Przechowuj go offline (wydruk w sejfie, menedżer haseł na innym urządzeniu).",
      "Nie wysyłaj go e-mailem ani komunikatorem. Nexus nie zna tego klucza i nie odtworzy go.",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = "nexus-zestaw-ratunkowy-sejfu.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="space-y-3">
      <div className="print-area space-y-3 rounded-lg border-2 border-dashed p-4">
        <p className="text-sm font-semibold">Nexus — zestaw ratunkowy sejfu</p>
        <p className="text-xs text-muted-foreground">
          {name} &lt;{email}&gt; · {date}
        </p>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Klucz odzyskiwania</p>
        <p className="secret break-all text-base font-semibold leading-relaxed" data-testid="recovery-key">
          {recoveryKey}
        </p>
        <p className="text-xs text-muted-foreground">Przechowuj offline. Nexus nie zna tego klucza i nie odtworzy go.</p>
      </div>
      <div className="flex items-start gap-2 rounded-md bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Bez hasła głównego i bez tego klucza dane w sejfie są nie do odzyskania — to cecha szyfrowania end-to-end, nie błąd. W zespole administrator może po resecie ponownie nadać Ci dostęp do sejfów klientów.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 no-print">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer aria-hidden /> Drukuj
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <Download aria-hidden /> Pobierz plik
        </Button>
      </div>
    </div>
  );
}
