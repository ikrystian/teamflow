import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { GlassAtmosphere } from "@/components/layout/glass-atmosphere";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <GlassAtmosphere />
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary bg-linear-to-b from-white/16 to-transparent text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.28),0_6px_18px_-8px_var(--primary)]">
            <LockKeyhole className="size-4" aria-hidden />
          </span>
          Nexus
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        <Link href="/legal/privacy" className="underline-offset-4 hover:underline">Polityka prywatności</Link> ·{" "}
        <Link href="/legal/terms" className="underline-offset-4 hover:underline">Regulamin</Link> ·{" "}
        <Link href="/legal/security" className="underline-offset-4 hover:underline">Bezpieczeństwo</Link>
      </footer>
    </div>
  );
}
