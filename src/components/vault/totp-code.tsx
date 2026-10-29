"use client";

import { useEffect, useMemo, useState } from "react";
import { parseTotp, totp } from "@/lib/crypto/totp";
import { cn } from "@/lib/utils";

/** Bieżący kod 2FA z licznikiem ważności (rozdział 5.3). */
export function TotpCode({ secret, onCopy, className }: { secret: string; onCopy?: () => void; className?: string }) {
  const [state, setState] = useState<{ code: string; remaining: number; period: number } | null>(null);
  const cfg = useMemo(() => {
    try {
      return parseTotp(secret);
    } catch {
      return null;
    }
  }, [secret]);
  const error = cfg === null;
  useEffect(() => {
    let alive = true;
    if (!cfg) return;
    const tick = () => void totp(cfg).then((r) => alive && setState(r));
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [cfg]);
  if (error) return <span className="text-xs text-destructive">Nieprawidłowy sekret 2FA</span>;
  if (!state) return <span className="text-xs text-muted-foreground">…</span>;
  const pct = (state.remaining / state.period) * 100;
  return (
    <button type="button" onClick={onCopy} className={cn("group inline-flex items-center gap-2 rounded px-1.5 py-0.5 hover:bg-muted", className)} aria-label={`Kod 2FA ${state.code}, ważny ${state.remaining} sekund. Kliknij, aby skopiować`}>
      <span className="secret text-sm font-semibold tabular-nums">
        {state.code.slice(0, Math.ceil(state.code.length / 2))} {state.code.slice(Math.ceil(state.code.length / 2))}
      </span>
      <svg viewBox="0 0 20 20" className="size-4 -rotate-90" aria-hidden>
        <circle cx="10" cy="10" r="8" fill="none" strokeWidth="3" className="stroke-muted" />
        <circle cx="10" cy="10" r="8" fill="none" strokeWidth="3" strokeDasharray={`${(pct / 100) * 50.27} 50.27`} className={state.remaining <= 5 ? "stroke-red-500" : "stroke-primary"} />
      </svg>
      <span className="sr-only">{state.remaining} s</span>
    </button>
  );
}
