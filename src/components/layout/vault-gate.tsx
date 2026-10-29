"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { UserPreferences } from "@/lib/db/schema";
import { keyMaterialSize, lockVault, setWorkspaceInfo, syncVault, useVault } from "@/lib/vault/store";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"] as const;

/**
 * Sesja sejfu w całym panelu: automatyczna blokada po bezczynności (domyślnie 15 min) i po
 * zamknięciu karty oraz okresowa synchronizacja — także gdy osoba pracuje w module projektów.
 * Klucze żyją tylko w pamięci karty.
 */
export function VaultSession({ workspace, preferences }: { workspace: { id: string; role: string }; preferences: UserPreferences }) {
  const status = useVault((s) => s.status);
  const last = useRef(0);

  useEffect(() => {
    setWorkspaceInfo(workspace);
    // Tylko poza produkcją: liczniki materiału kluczy (bez samych kluczy) dla testów e2e kryterium „blokada czyści klucze”.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __vaultKeyMaterial?: typeof keyMaterialSize }).__vaultKeyMaterial = keyMaterialSize;
  }, [workspace]);

  // Auto-blokada po bezczynności.
  useEffect(() => {
    if (status !== "unlocked") return;
    const minutes = preferences.autoLockMinutes ?? 15;
    last.current = Date.now();
    const bump = () => {
      last.current = Date.now();
    };
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, bump, { passive: true });
    const timer = setInterval(() => {
      if (Date.now() - last.current > minutes * 60_000) lockVault("idle");
    }, 5_000);
    // Zamknięcie lub przeładowanie karty: zerujemy klucze (pamięć i tak zniknie).
    const onHide = () => lockVault("tab_closed");
    window.addEventListener("pagehide", onHide);
    return () => {
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, bump);
      clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
    };
  }, [status, preferences.autoLockMinutes]);

  // Okresowa synchronizacja: nowe wpisy, oczekujące nadania kluczy, rotacje.
  useEffect(() => {
    if (status !== "unlocked") return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void syncVault().catch(() => {});
    }, 60_000);
    return () => clearInterval(t);
  }, [status]);

  return null;
}

/** Bramka sejfu: ekrany modułu klientów i sejfu wymagają odblokowanego sejfu. */
export function VaultGate({ children }: { children: React.ReactNode }) {
  const status = useVault((s) => s.status);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (status === "locked") {
      const q = search.toString();
      router.replace(`/auth/unlock?next=${encodeURIComponent(pathname + (q ? `?${q}` : ""))}`);
    }
  }, [status, pathname, search, router]);

  if (status !== "unlocked") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Sejf jest zablokowany — przekierowanie do odblokowania…</span>
      </div>
    );
  }
  return <>{children}</>;
}
