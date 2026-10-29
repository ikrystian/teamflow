import Link from "next/link";
import { GlassAtmosphere } from "@/components/layout/glass-atmosphere";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <GlassAtmosphere />
      <header className="glass-surface sticky top-0 z-10 border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-semibold">Nexus</Link>
          <nav className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <Link href="/legal/privacy" className="hover:underline">Prywatność</Link>
            <Link href="/legal/terms" className="hover:underline">Regulamin</Link>
            <Link href="/legal/subprocessors" className="hover:underline">Podprocesorzy</Link>
            <Link href="/legal/processing" className="hover:underline">Rejestr czynności</Link>
            <Link href="/legal/security" className="hover:underline">Bezpieczeństwo</Link>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <article className="glass-surface glass-rise space-y-4 rounded-2xl border p-6 text-sm sm:p-8 leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:text-left">
          <p className="rounded-md bg-amber-100 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
            Szablon do uzupełnienia i weryfikacji przez prawnika lub inspektora ochrony danych — ten tekst nie jest poradą prawną.
          </p>
          {children}
        </article>
      </main>
    </div>
  );
}
