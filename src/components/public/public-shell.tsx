import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { GlassAtmosphere } from "@/components/layout/glass-atmosphere";

/** Strony publiczne (bez logowania): bez skryptów firm trzecich, bez śledzenia. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <GlassAtmosphere />
      <header className="px-4 py-4 sm:px-8">
        <span className="flex items-center gap-2 font-semibold">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary bg-linear-to-b from-white/16 to-transparent text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.28),0_6px_18px_-8px_var(--primary)]">
            <LockKeyhole className="size-4" aria-hidden />
          </span>
          Nexus
        </span>
      </header>
      <main id="main" className="flex flex-1 justify-center px-4 pb-16">
        <div className="glass-surface glass-rise w-full max-w-2xl rounded-2xl border p-4 sm:p-6">{children}</div>
      </main>
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        Dane są szyfrowane w przeglądarce (end-to-end). <Link href="/legal/security" className="underline">Jak to działa?</Link>
      </footer>
    </div>
  );
}
