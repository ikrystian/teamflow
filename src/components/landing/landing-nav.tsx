import Link from "next/link";
import { NexusLogo } from "@/components/ui/nexus-logo";
import type { Ctas } from "./cta-links";

const SECTIONS = [
  { href: "#produkt", label: "Produkt" },
  { href: "#moduly", label: "Moduły" },
  { href: "#automatyzacje", label: "Automatyzacje" },
  { href: "#sejf", label: "Sejf" },
];

export function LandingNav({ ctas }: { ctas: Ctas }) {
  return (
    <header data-nav className="lx-nav">
      <div className="lx-nav-pill">
        <Link href="/" className="lx-nav-brand">
          <NexusLogo size={30} className="size-[30px]" />
          Nexus
        </Link>
        <nav aria-label="Sekcje strony" className="hidden items-center gap-0.5 md:flex">
          {SECTIONS.map((section) => (
            <a key={section.href} href={section.href} className="lx-nav-link">
              {section.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link href={ctas.secondary.href} className="lx-nav-link max-sm:hidden">
            {ctas.secondary.label}
          </Link>
          <Link href={ctas.primary.href} className="lx-btn lx-btn--primary lx-btn--sm">
            {ctas.primary.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
