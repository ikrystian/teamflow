"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureCrypto, generateIntakeKeyPair, packIntakeKeyPair, sealKeyFor, wipe } from "@/lib/crypto";
import { createWorkspaceAction } from "@/server/actions/account";
import { FormError } from "./auth-card";

/** Nowa przestrzeń + para kluczy skrzynki „Do przejrzenia” (prywatny klucz tylko jako kopia dla twórcy). */
export function WorkspaceCreate({ publicKey, next, defaultName }: { publicKey: string; next: string; defaultName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await ensureCrypto();
      const id = crypto.randomUUID();
      const intake = generateIntakeKeyPair();
      const packed = packIntakeKeyPair(intake.keyPair);
      const intakeGrant = sealKeyFor(publicKey, packed, "intake", id, 1);
      wipe(packed, intake.keyPair.privateKey);
      const r = await createWorkspaceAction({ id, name, intakePublicKey: intake.publicKey, intakeGrant });
      if (!r.ok) throw new Error(r.error);
      router.push(`/auth/unlock?next=${encodeURIComponent(next)}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ws">Nazwa przestrzeni</Label>
        <Input id="ws" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Studio Kowalski lub Agencja XYZ" required minLength={2} autoFocus />
        <p className="text-xs text-muted-foreground">Freelancer jest jedynym członkiem swojej przestrzeni; agencja zaprosi zespół później.</p>
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={busy || name.trim().length < 2}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Utwórz przestrzeń
      </Button>
    </form>
  );
}
