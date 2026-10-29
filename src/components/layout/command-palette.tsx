"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, CheckSquare, FolderOpen, Inbox, KeyRound, LayoutDashboard, Lock, Plus, Settings, ShieldCheck, SquarePen, Upload, Users, Vault } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { useProjects } from "@/contexts/projects-context";
import { api } from "@/lib/vault/api";
import { normalize } from "@/lib/vault/search";
import { lockVault, searchVault, useVault } from "@/lib/vault/store";
import { TYPE_DEFS, type CredentialType } from "@/lib/vault/types";
import { TypeIcon } from "@/components/vault/category";

/**
 * Stan palety. `ctrlKClaims` — liczba komponentów, które same obsługują Ctrl+K
 * (szybkie dodawanie zadania na tablicy projektu); wtedy paletę otwiera „/” lub przycisk „Szukaj”.
 */
export const usePalette = create<{ open: boolean; setOpen: (o: boolean) => void; ctrlKClaims: number }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  ctrlKClaims: 0,
}));

/** Rezerwuje Ctrl+K dla komponentu na czas jego zamontowania. */
export function claimCtrlK() {
  usePalette.setState((s) => ({ ctrlKClaims: s.ctrlKClaims + 1 }));
  return () => usePalette.setState((s) => ({ ctrlKClaims: Math.max(0, s.ctrlKClaims - 1) }));
}

/** Słowa kluczowe akcji „Dodaj dostęp … dla …” (rozdział 4.9). */
const TYPE_KEYWORDS: [string, CredentialType][] = [
  ["ftp", "ftp"],
  ["sftp", "ftp"],
  ["ssh", "ssh"],
  ["serwer", "ssh"],
  ["wordpress", "website"],
  ["www", "website"],
  ["cms", "website"],
  ["strona", "website"],
  ["hosting", "hosting"],
  ["cpanel", "hosting"],
  ["baza", "database"],
  ["mysql", "database"],
  ["domena", "domain"],
  ["dns", "domain"],
  ["poczta", "email"],
  ["email", "email"],
  ["e-mail", "email"],
  ["facebook", "social"],
  ["instagram", "social"],
  ["social", "social"],
  ["ads", "ads"],
  ["reklama", "ads"],
  ["analytics", "ads"],
  ["api", "api"],
  ["klucz", "api"],
  ["notatka", "secure_note"],
];

export function CommandPalette({ onShortcuts, crm = true }: { onShortcuts: () => void; crm?: boolean }) {
  const { open, setOpen } = usePalette();
  const router = useRouter();
  const [q, setQ] = useState("");
  const vaultUnlocked = useVault((s) => s.status === "unlocked");
  const vaultClients = useVault((s) => s.clients);
  const indexSize = useVault((s) => s.index.length);
  const { projects } = useProjects();
  // Przy zablokowanym sejfie nazwy klientów pochodzą z katalogu CRM (bez danych z sejfu).
  const { data: directory } = useQuery({
    queryKey: ["client-directory"],
    queryFn: () => api<{ clients: { id: string; name: string }[] }>("/api/clients"),
    enabled: crm && open && !vaultUnlocked,
    staleTime: 60_000,
  });
  const clients = useMemo(
    () => (vaultUnlocked ? vaultClients : (directory?.clients ?? []).map((c) => ({ ...c, canEdit: false }))),
    [vaultUnlocked, vaultClients, directory],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !usePalette.getState().ctrlKClaims) {
        e.preventDefault();
        setOpen(!usePalette.getState().open);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        lockVault("manual");
      }
      const target = e.target as HTMLElement;
      const typing = /^(input|textarea|select)$/i.test(target.tagName) || target.isContentEditable;
      if (!typing && e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onShortcuts();
      }
      if (!typing && e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen, onShortcuts]);

  const results = useMemo(() => (vaultUnlocked && q.trim() ? searchVault(q).slice(0, 12) : []), [q, indexSize, vaultUnlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const matchedProjects = useMemo(() => {
    const n = normalize(q.trim());
    const active = projects.filter((p) => !p.archived);
    if (!n) return active.slice(0, 5);
    const terms = n.split(/\s+/);
    return active.filter((p) => terms.every((t) => normalize(p.name).includes(t))).slice(0, 6);
  }, [q, projects]);

  const matchedClients = useMemo(() => {
    const n = normalize(q.trim());
    if (!n) return clients.slice(0, 6);
    const terms = n.split(/\s+/);
    return clients.filter((c) => terms.every((t) => normalize(c.name).includes(t) || TYPE_KEYWORDS.some(([k]) => k === t))).slice(0, 6);
  }, [q, clients]);

  const addActions = useMemo(() => {
    const n = normalize(q.trim());
    const kw = TYPE_KEYWORDS.find(([k]) => n.split(/\s+/).includes(k));
    if (!kw) return [];
    const rest = n
      .split(/\s+/)
      .filter((t) => t !== kw[0] && t !== "dodaj" && t !== "dla")
      .join(" ");
    const cs = clients.filter((c) => c.canEdit && (!rest || normalize(c.name).includes(rest))).slice(0, 5);
    return cs.map((c) => ({ type: kw[1], client: c }));
  }, [q, clients]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Paleta poleceń" description="Szukaj projektów, klientów, dostępów i akcji">
      <Command shouldFilter={false}>
        <CommandInput placeholder={crm ? "Projekt, klient, dostęp, login… lub „ftp Kowalski”" : "Szukaj projektu lub akcji…"} value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>Brak wyników</CommandEmpty>
          {addActions.length ? (
            <CommandGroup heading="Akcje">
              {addActions.map((a) => (
                <CommandItem key={`add-${a.client.id}`} value={`add-${a.client.id}`} onSelect={() => go(`/dashboard/clients/${a.client.id}/credentials?new=${a.type}`)}>
                  <Plus aria-hidden /> Dodaj dostęp {TYPE_DEFS[a.type].label} dla {a.client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results.length ? (
            <CommandGroup heading="Dostępy">
              {results.map((r) => (
                <CommandItem key={r.id} value={`cred-${r.id}`} onSelect={() => go(r.direct ? `/dashboard/vault?open=${r.id}` : `/dashboard/clients/${r.clientId}/credentials?open=${r.id}`)}>
                  <TypeIcon type={r.type} className="size-6" />
                  <span className="truncate">{r.overview?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {r.clientName}
                    {r.overview?.login ? ` · ${r.overview.login}` : ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {matchedProjects.length ? (
            <CommandGroup heading="Projekty">
              {matchedProjects.map((p) => (
                <CommandItem key={p.id} value={`project-${p.id}`} onSelect={() => go(`/dashboard/projects/${p.id}`)}>
                  <FolderOpen aria-hidden style={{ color: p.color || undefined }} /> {p.name}
                  {p.client ? <span className="truncate text-xs text-muted-foreground">{p.client.name}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {crm && matchedClients.length ? (
            <CommandGroup heading="Klienci">
              {matchedClients.map((c) => (
                <CommandItem key={c.id} value={`client-${c.id}`} onSelect={() => go(`/dashboard/clients/${c.id}`)}>
                  <Users aria-hidden /> {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          <CommandSeparator />
          <CommandGroup heading="Przejdź do">
            <CommandItem value="nav-dashboard" onSelect={() => go("/dashboard")}>
              <LayoutDashboard aria-hidden /> Panel
            </CommandItem>
            <CommandItem value="nav-tasks" onSelect={() => go("/dashboard/tasks")}>
              <CheckSquare aria-hidden /> Moje zadania
            </CommandItem>
            <CommandItem value="nav-new-task" onSelect={() => go("/dashboard/tasks/new")}>
              <SquarePen aria-hidden /> Nowe zadanie
            </CommandItem>
            <CommandItem value="nav-projects" onSelect={() => go("/dashboard/projects")}>
              <FolderOpen aria-hidden /> Projekty
            </CommandItem>
            <CommandItem value="nav-reports" onSelect={() => go("/dashboard/reports")}>
              <BarChart3 aria-hidden /> Raporty
            </CommandItem>
            <CommandItem value="nav-settings" onSelect={() => go("/dashboard/settings")}>
              <Settings aria-hidden /> Ustawienia
            </CommandItem>
          </CommandGroup>
          {crm ? (
          <CommandGroup heading="Klienci i dostępy">
            <CommandItem value="nav-clients" onSelect={() => go("/dashboard/clients")}>
              <Users aria-hidden /> Klienci
            </CommandItem>
            <CommandItem value="nav-new-client" onSelect={() => go("/dashboard/clients?new=1")}>
              <Plus aria-hidden /> Nowy klient
            </CommandItem>
            <CommandItem value="nav-vault" onSelect={() => go("/dashboard/vault")}>
              <Vault aria-hidden /> Wszystkie dostępy
            </CommandItem>
            <CommandItem value="nav-inbox" onSelect={() => go("/dashboard/inbox")}>
              <Inbox aria-hidden /> Do przejrzenia
            </CommandItem>
            <CommandItem value="nav-security" onSelect={() => go("/dashboard/security")}>
              <ShieldCheck aria-hidden /> Kondycja haseł
            </CommandItem>
            <CommandItem value="nav-activity" onSelect={() => go("/dashboard/activity")}>
              <Activity aria-hidden /> Dziennik zdarzeń
            </CommandItem>
            <CommandItem value="nav-import" onSelect={() => go("/dashboard/settings/data")}>
              <Upload aria-hidden /> Import i eksport
            </CommandItem>
            <CommandItem value="nav-generator" onSelect={() => go("/dashboard/security?tab=generator")}>
              <KeyRound aria-hidden /> Generator haseł
            </CommandItem>
            {vaultUnlocked ? (
              <CommandItem value="nav-lock" onSelect={() => (setOpen(false), lockVault("manual"))}>
                <Lock aria-hidden /> Zablokuj sejf <CommandShortcut>Ctrl ⇧ L</CommandShortcut>
              </CommandItem>
            ) : null}
          </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
