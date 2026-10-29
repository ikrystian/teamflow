"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createUserKeys, ensureCrypto, wipe } from "@/lib/crypto";
import { evaluatePassword } from "@/lib/crypto/strength";
import { MASTER_PASSWORD_MIN } from "@/lib/validation";
import { setupVaultAction } from "@/server/actions/account";
import { PasswordInput } from "@/components/vault/password-input";
import { FormError } from "./auth-card";
import { RecoveryKit } from "./recovery-kit";

/**
 * Hasło główne sejfu: klucze powstają w przeglądarce (Argon2id + X25519),
 * na serwer trafiają wyłącznie zaszyfrowane kopie i skrót klucza uwierzytelniającego.
 */
export function VaultSetup({ userId, email, name, next }: { userId: string; email: string; name: string; next: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < MASTER_PASSWORD_MIN) return setError(`Hasło główne musi mieć co najmniej ${MASTER_PASSWORD_MIN} znaków`);
    if (pw !== pw2) return setError("Hasła się różnią");
    setBusy(true);
    try {
      const strength = await evaluatePassword(pw, [email, name, "nexus", "dostepnik"]);
      if (strength.score < 3) throw new Error("Hasło główne jest za słabe — użyj dłuższej frazy (np. z generatora)");
      await ensureCrypto();
      const created = await createUserKeys(userId, pw);
      wipe(created.keyPair.privateKey);
      const r = await setupVaultAction(created.bundle);
      if (!r.ok) throw new Error(r.error);
      setPw("");
      setPw2("");
      setRecoveryKey(created.recoveryKey);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (recoveryKey) {
    return (
      <div className="space-y-4">
        <RecoveryKit recoveryKey={recoveryKey} email={email} name={name} />
        <div className="flex items-center gap-2 no-print">
          <Checkbox id="saved" checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
          <Label htmlFor="saved" className="font-normal">Wydrukowałem(-am) lub bezpiecznie zapisałem(-am) klucz odzyskiwania</Label>
        </div>
        <Button className="w-full no-print" disabled={!saved} onClick={() => (router.push(`/auth/signup/workspace?next=${encodeURIComponent(next)}`), router.refresh())}>
          Dalej
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Hasło główne jest inne niż hasło konta i nigdy nie trafia na serwer.</li>
        <li>Odszyfrowuje dane wyłącznie w Twojej przeglądarce.</li>
        <li>Najlepiej sprawdza się długa fraza z kilku słów.</li>
      </ul>
      <div className="space-y-1.5">
        <Label htmlFor="master">Hasło główne</Label>
        <PasswordInput id="master" value={pw} onChange={setPw} inputs={[email, name]} autoFocus required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="master2">Powtórz hasło główne</Label>
        <PasswordInput id="master2" value={pw2} onChange={setPw2} generator={false} meter={false} required />
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={busy || !pw || !pw2}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} {busy ? "Generowanie kluczy…" : "Utwórz sejf"}
      </Button>
    </form>
  );
}
