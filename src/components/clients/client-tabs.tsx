"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClientTabs({ clientId, counts }: { clientId: string; counts: { credentials: number; contacts: number; domains: number; pendingRequests: number; projects: number } }) {
  const pathname = usePathname();
  const base = `/dashboard/clients/${clientId}`;
  const tabs = [
    { href: base, label: "Przegląd" },
    { href: `${base}/projects`, label: "Projekty", count: counts.projects },
    { href: `${base}/credentials`, label: "Dostępy", count: counts.credentials },
    { href: `${base}/contacts`, label: "Kontakty", count: counts.contacts },
    { href: `${base}/domains`, label: "Domeny i hosting", count: counts.domains },
    { href: `${base}/notes`, label: "Notatki" },
    { href: `${base}/activity`, label: "Historia" },
  ];
  return (
    <nav aria-label="Sekcje karty klienta" className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {tabs.map((t) => {
          const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn("inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap", active ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                {t.label}
                {t.count ? <span className="rounded bg-muted px-1.5 text-xs tabular-nums">{t.count}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
