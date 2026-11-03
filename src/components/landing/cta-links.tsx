import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Cta = { href: string; label: string };

/** Wezwania do działania zależą od trybu wdrożenia (konto z rejestracji albo z zaproszenia). */
export type Ctas = { primary: Cta; secondary: Cta; note: string };

export function CtaButtons({ ctas, className }: { ctas: Ctas; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Link href={ctas.primary.href} className="lx-btn lx-btn--primary">
        {ctas.primary.label}
        <ArrowRight aria-hidden />
      </Link>
      <Link href={ctas.secondary.href} className="lx-btn lx-btn--glass">
        {ctas.secondary.label}
      </Link>
    </div>
  );
}
