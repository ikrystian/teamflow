"use client";

import { Bell, Building2, Database, KeyRound, ListChecks, Mail, Palette, Shield, Tag, User, Users, UsersRound, Vault } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ICONS = { user: User, shield: Shield, vault: Vault, bell: Bell, key: KeyRound, palette: Palette, list: ListChecks, tag: Tag, team: UsersRound, building: Building2, database: Database, mail: Mail, users: Users };

export type SettingsNavGroup = { label: string; items: { href: string; label: string; icon: keyof typeof ICONS }[] };

/** Nawigacja ustawień całego Nexusa: konto, moduł projektów, moduł klientów i sejfu, administracja. */
export function SettingsNav({ groups }: { groups: SettingsNavGroup[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sekcje ustawień" className="w-full shrink-0 lg:sticky lg:top-0 lg:w-56">
      <ul className="flex gap-0.5 overflow-x-auto border-b pb-2 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0">
        {groups.map((group) => (
          <li key={group.label} className="contents lg:block lg:[&:not(:first-child)]:mt-4">
            <div className="hidden px-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground/70 uppercase lg:block">{group.label}</div>
            <ul className="contents lg:block">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = pathname === item.href;
                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-8 items-center gap-2 rounded-md px-2.5 text-sm whitespace-nowrap text-muted-foreground hover:bg-accent/60",
                        active && "bg-accent font-medium text-foreground",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
