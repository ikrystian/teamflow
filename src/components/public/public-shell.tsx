import { LockKeyhole } from "lucide-react";
import Link from "next/link";

/** Strony publiczne (bez logowania): bez skryptów firm trzecich, bez śledzenia. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="px-4 py-4 sm:px-8">
        <span className="flex items-center gap-2 font-semibold">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LockKeyhole className="size-4" aria-hidden />
          </span>
          Nexus
        </span>
      </header>
      <main id="main" className="flex flex-1 justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        Dane są szyfrowane w przeglądarce (end-to-end). <Link href="/legal/security" className="underline">Jak to działa?</Link>
      </footer>
    </div>
  );
}
