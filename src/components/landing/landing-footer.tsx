import Link from "next/link";
import { NexusLogo } from "@/components/ui/nexus-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Ctas } from "./cta-links";

export function LandingFooter({ ctas }: { ctas: Ctas }) {
  const columns = [
    {
      title: "Produkt",
      links: [
        { href: "#moduly", label: "Moduły" },
        { href: "#automatyzacje", label: "Automatyzacje" },
        { href: "#sejf", label: "Sejf dostępów" },
      ],
    },
    {
      title: "Konto",
      links: [
        { href: "/auth/signin", label: "Zaloguj się" },
        { href: "/auth/signup", label: ctas.primary.href === "/auth/signup" ? "Załóż konto" : "Mam zaproszenie" },
        { href: "/auth/forgot-password", label: "Nie pamiętam hasła" },
      ],
    },
    {
      title: "Informacje",
      links: [
        { href: "/legal/privacy", label: "Polityka prywatności" },
        { href: "/legal/terms", label: "Regulamin" },
        { href: "/legal/security", label: "Bezpieczeństwo" },
        { href: "/legal/subprocessors", label: "Podprocesorzy" },
      ],
    },
  ];

  return (
    <footer className="lx-foot">
      <div className="lx-container">
        <div className="lx-foot-grid">
          <div>
            <Link href="/" className="lx-nav-brand">
              <NexusLogo size={30} className="size-[30px]" />
              Nexus
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--lx-soft)]">
              Projekty, czas pracy, klienci i ich dostępy — w jednym węźle.
            </p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="lx-foot-h">{column.title}</p>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("#") ? (
                      <a href={link.href}>{link.label}</a>
                    ) : (
                      <Link href={link.href}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="lx-foot-bar">
          <p>© {new Date().getFullYear()} Nexus</p>
          <ThemeToggle />
        </div>
      </div>

      <p aria-hidden className="lx-wordmark">
        Ne<em>x</em>us
      </p>
    </footer>
  );
}
