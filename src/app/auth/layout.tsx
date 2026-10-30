import Link from "next/link";
import { GlassAtmosphere } from "@/components/layout/glass-atmosphere";
import { NexusLogo } from "@/components/ui/nexus-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <GlassAtmosphere />
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <NexusLogo size={32} className="size-8" />
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
