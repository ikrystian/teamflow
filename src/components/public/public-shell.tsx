import Link from "next/link";
import { GlassAtmosphere } from "@/components/layout/glass-atmosphere";
import { NexusLogo } from "@/components/ui/nexus-logo";

/** Strony publiczne (bez logowania): bez skryptów firm trzecich, bez śledzenia. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <GlassAtmosphere />
      <header className="px-4 py-4 sm:px-8">
        <span className="flex items-center gap-2.5 font-semibold tracking-tight">
          <NexusLogo size={32} className="size-8" />
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
