"use client";

import { FingerprintPattern, KeyRound, Loader2, LockKeyhole, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth/client";
import { evaluatePassword } from "@/lib/crypto/strength";
import { evaluatePrf } from "@/lib/vault/prf";
import { recoverWithKey, resetKeys, unlockWithPassword, unlockWithPrf, useVault } from "@/lib/vault/store";
import { touchUnlockKeyAction } from "@/server/actions/account";
import { PasswordInput } from "@/components/vault/password-input";
import { FormError } from "./auth-card";
import { RecoveryKit } from "./recovery-kit";

type PrfKey = { id: string; credentialId: string; label: string; prfSalt: string; wrappedPrivateKey: string };

export function UnlockForm({ next, email, name, inTeam, freshSession, prfKeys }: { next: string; email: string; name: string; inTeam: boolean; freshSession: boolean; prfKeys: PrfKey[] }) {
  const t = useTranslations("vault");
  const router = useRouter();
  const lockReason = useVault((s) => s.lockReason);
  const [tab, setTab] = useState<"master" | "recovery" | "reset">("master");
  const [password, setPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newRecovery, setNewRecovery] = useState(true);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const go = () => router.replace(next);

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function strongEnough(pw: string) {
    if (pw.length < 12) throw new Error("Nowe hasło główne musi mieć co najmniej 12 znaków");
    if ((await evaluatePassword(pw, [email, name])).score < 3) throw new Error("Nowe hasło główne jest za słabe");
  }

  if (issuedKey) {
    return (
      <div className="space-y-4">
        <p className="text-sm">Sejf odblokowany. To Twój nowy klucz odzyskiwania — poprzedni przestał działać.</p>
        <RecoveryKit recoveryKey={issuedKey} email={email} name={name} />
        <Button className="w-full no-print" onClick={go}>Przejdź do aplikacji</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lockReason === "idle" ? <p className="rounded-md bg-muted p-3 text-sm">{t("lockedIdle")}</p> : null}
      <Tabs value={tab} onValueChange={(v) => (setTab(v as typeof tab), setError(null))}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="master">
            <LockKeyhole aria-hidden /> Hasło
          </TabsTrigger>
          <TabsTrigger value="recovery">
            <KeyRound aria-hidden /> Klucz
          </TabsTrigger>
          <TabsTrigger value="reset">Reset</TabsTrigger>
        </TabsList>

        <TabsContent value="master" className="pt-2">
          <form onSubmit={(e) => (e.preventDefault(), guard(async () => (await unlockWithPassword(password), setPassword(""), go())))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="master">{t("masterPassword")}</Label>
              <Input id="master" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="secret" autoFocus required />
            </div>
            <FormError message={error} />
            <Button type="submit" className="w-full" disabled={busy || !password}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} {busy ? t("unlocking") : t("unlock")}
            </Button>
            {prfKeys.map((k) => (
              <Button
                key={k.id}
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() =>
                  guard(async () => {
                    const out = await evaluatePrf(k.credentialId, k.prfSalt);
                    await unlockWithPrf(out, k.wrappedPrivateKey, k.credentialId);
                    void touchUnlockKeyAction(k.id);
                    go();
                  })
                }
              >
                <FingerprintPattern aria-hidden /> Odblokuj passkeyem: {k.label}
              </Button>
            ))}
          </form>
        </TabsContent>

        <TabsContent value="recovery" className="pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void guard(async () => {
                await strongEnough(newPw);
                const issued = await recoverWithKey(recoveryKey, newPw, newRecovery);
                setRecoveryKey("");
                setNewPw("");
                if (issued) setIssuedKey(issued);
                else go();
              });
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">Wpisz klucz odzyskiwania z zestawu ratunkowego i ustaw nowe hasło główne.</p>
            <div className="space-y-1.5">
              <Label htmlFor="rk">Klucz odzyskiwania</Label>
              <Input id="rk" value={recoveryKey} onChange={(e) => setRecoveryKey(e.target.value)} className="secret uppercase" autoComplete="off" spellCheck={false} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newpw">Nowe hasło główne</Label>
              <PasswordInput id="newpw" value={newPw} onChange={setNewPw} inputs={[email, name]} required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="newrk" checked={newRecovery} onCheckedChange={(v) => setNewRecovery(v === true)} />
              <Label htmlFor="newrk" className="font-normal">Wygeneruj nowy klucz odzyskiwania (zalecane)</Label>
            </div>
            {!freshSession ? <p className="text-sm text-amber-700 dark:text-amber-400">Ze względów bezpieczeństwa wyloguj się i zaloguj ponownie (hasło + 2FA) przed odzyskiwaniem.</p> : null}
            <FormError message={error} />
            <Button type="submit" className="w-full" disabled={busy || !recoveryKey || !newPw}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Odzyskaj dostęp
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="reset" className="space-y-4 pt-2">
          <div className="flex items-start gap-2 rounded-md bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">Nie mam hasła głównego ani klucza odzyskiwania</p>
              {inTeam ? (
                <p>Możesz utworzyć nowe klucze. Administrator Twojej przestrzeni po potwierdzeniu tożsamości (np. telefonicznie) ponownie nada Ci dostęp do sejfów klientów.</p>
              ) : (
                <p>Pracujesz sam(a) — bez hasła głównego i klucza odzyskiwania danych w sejfie nie da się odszyfrować. Reset utworzy pusty sejf; dotychczasowe wpisy pozostaną nieczytelne.</p>
              )}
            </div>
          </div>
          {!freshSession ? (
            <div className="space-y-2">
              <p className="text-sm">Reset wymaga świeżego logowania (hasło konta + 2FA, w ciągu ostatnich 10 minut).</p>
              <Button variant="outline" className="w-full" onClick={async () => (await authClient.signOut(), router.push(`/auth/signin?next=${encodeURIComponent(next)}`))}>
                Zaloguj się ponownie
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void guard(async () => {
                  await strongEnough(newPw);
                  const key = await resetKeys(newPw);
                  setNewPw("");
                  setIssuedKey(key);
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="resetpw">Nowe hasło główne</Label>
                <PasswordInput id="resetpw" value={newPw} onChange={setNewPw} inputs={[email, name]} required />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ack" checked={ack} onCheckedChange={(v) => setAck(v === true)} />
                <Label htmlFor="ack" className="font-normal">Rozumiem, że dostęp do sejfów wróci dopiero po zatwierdzeniu przez administratora</Label>
              </div>
              <FormError message={error} />
              <Button type="submit" variant="destructive" className="w-full" disabled={busy || !ack || !newPw}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Zresetuj klucze
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>
      <Button variant="link" className="w-full text-muted-foreground" onClick={async () => (await authClient.signOut(), router.push("/auth/signin"))}>
        Wyloguj się
      </Button>
    </div>
  );
}
