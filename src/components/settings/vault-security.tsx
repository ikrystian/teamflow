"use client";

import { FingerprintPattern, KeyRound, Loader2, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evaluatePassword } from "@/lib/crypto/strength";
import { formatDateTime } from "@/lib/format";
import { StepUpCancelled } from "@/lib/vault/step-up";
import { prfSupported } from "@/lib/vault/prf";
import { changeMasterPassword, myFingerprint, registerPrfUnlock } from "@/lib/vault/store";
import { removeUnlockKeyAction } from "@/server/actions/account";
import { RecoveryKit } from "@/components/auth/recovery-kit";
import { PasswordInput } from "@/components/vault/password-input";

export function VaultSecurity({ prfKeys, email, name }: { prfKeys: { id: string; label: string; createdAt: string; lastUsedAt: string | null }[]; email: string; name: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [newRecovery, setNewRecovery] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const fp = myFingerprint();

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return toast.error("Hasła się różnią");
    if (pw.length < 12 || (await evaluatePassword(pw, [email, name])).score < 3) return toast.error("Hasło główne jest za słabe");
    setBusy("master");
    try {
      const key = await changeMasterPassword(pw, newRecovery);
      setPw("");
      setPw2("");
      toast.success("Zmieniono hasło główne");
      if (key) setIssued(key);
    } catch (err) {
      if (!(err instanceof StepUpCancelled)) toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hasło główne sejfu</CardTitle>
          <CardDescription>Zmiana wymaga potwierdzenia obecnym hasłem głównym lub passkeyem. Klucze sejfów pozostają bez zmian.</CardDescription>
        </CardHeader>
        <CardContent>
          {issued ? (
            <div className="space-y-3">
              <RecoveryKit recoveryKey={issued} email={email} name={name} />
              <Button onClick={() => setIssued(null)} className="no-print">
                Zapisałem(-am) nowy klucz
              </Button>
            </div>
          ) : (
            <form onSubmit={change} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mp-new">Nowe hasło główne</Label>
                <PasswordInput id="mp-new" value={pw} onChange={setPw} inputs={[email, name]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp-new2">Powtórz</Label>
                <PasswordInput id="mp-new2" value={pw2} onChange={setPw2} generator={false} meter={false} />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox id="mp-rk" checked={newRecovery} onCheckedChange={(v) => setNewRecovery(v === true)} />
                <Label htmlFor="mp-rk" className="font-normal">Wygeneruj też nowy klucz odzyskiwania</Label>
              </div>
              <div>
                <Button type="submit" disabled={busy === "master" || !pw}>
                  {busy === "master" ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />} Zmień hasło główne
                </Button>
              </div>
            </form>
          )}
          {fp ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Odcisk Twojego klucza publicznego: <span className="secret">{fp}</span>. Administrator może go porównać przy zatwierdzaniu kluczy.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Odblokowanie sejfu passkeyem (eksperymentalne)</CardTitle>
          <CardDescription>Rozszerzenie WebAuthn PRF — działa tylko w przeglądarkach i menedżerach passkeys, które je obsługują. Hasło główne nadal działa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-1">
            {prfKeys.map((k) => (
              <li key={k.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <FingerprintPattern className="size-4" aria-hidden />
                <span className="flex-1">{k.label}</span>
                <span className="text-xs text-muted-foreground">{k.lastUsedAt ? `użyto ${formatDateTime(k.lastUsedAt)}` : `dodano ${formatDateTime(k.createdAt)}`}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={`Usuń ${k.label}`}
                  onClick={async () => {
                    const r = await removeUnlockKeyAction(k.id);
                    if (!r.ok) return toast.error(r.error);
                    router.refresh();
                  }}
                >
                  <Trash aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nazwa, np. MacBook Touch ID" className="max-w-xs" aria-label="Nazwa passkeya do odblokowania" />
            <Button
              variant="outline"
              disabled={!prfSupported() || !label.trim() || busy === "prf"}
              onClick={async () => {
                setBusy("prf");
                try {
                  await registerPrfUnlock(label.trim());
                  setLabel("");
                  toast.success("Dodano odblokowanie passkeyem");
                  router.refresh();
                } catch (e) {
                  if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "prf" ? <Loader2 className="animate-spin" aria-hidden /> : <FingerprintPattern aria-hidden />} Dodaj
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
