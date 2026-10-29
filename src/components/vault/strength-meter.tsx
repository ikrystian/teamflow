"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { evaluatePassword, STRENGTH_LABELS, type StrengthResult } from "@/lib/crypto/strength";

const COLORS = ["bg-red-600", "bg-orange-500", "bg-amber-500", "bg-lime-600", "bg-emerald-600"];

/** Miernik siły na żywo (zxcvbn-ts) — działa lokalnie, hasło nie opuszcza przeglądarki. */
export function useStrength(password: string, inputs: string[] = []) {
  const [result, setResult] = useState<StrengthResult | null>(null);
  const key = inputs.join("\u0000");
  useEffect(() => {
    let alive = true;
    if (!password) return;
    const t = setTimeout(() => {
      void evaluatePassword(password, key ? key.split("\u0000") : []).then((r) => alive && setResult(r));
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [password, key]);
  return password ? result : null;
}

export function StrengthMeter({ password, inputs, className }: { password: string; inputs?: string[]; className?: string }) {
  const r = useStrength(password, inputs);
  if (!password) return null;
  const score = r?.score ?? 0;
  return (
    <div className={cn("space-y-1", className)} aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", r && i <= score ? COLORS[score] : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Siła: <span className="font-medium text-foreground">{r ? STRENGTH_LABELS[score] : "…"}</span>
        {r?.crackTime ? ` · złamanie offline: ${r.crackTime}` : ""}
        {r?.warning ? ` · ${r.warning}` : ""}
      </p>
    </div>
  );
}
