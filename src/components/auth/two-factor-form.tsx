"use client";

import { FingerprintPattern, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { verifySessionTotpAction } from "@/server/actions/account";
import { FormError } from "./auth-card";

/**
 * Drugi składnik logowania. Tryb „challenge” — po haśle konta (ciasteczko 2FA Better Auth);
 * tryb „session” — sesja z Google/Microsoft lub hasła bez TOTP wymaga potwierdzenia.
 */
export function TwoFactorForm({ mode, hasTotp, hasPasskey, next }: { mode: "challenge" | "session"; hasTotp: boolean; hasPasskey: boolean; next: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    router.push(next);
    router.refresh();
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "session") {
        const r = await verifySessionTotpAction(code);
        if (!r.ok) throw new Error(r.error);
      } else {
        const r = backup ? await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice: trust }) : await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice: trust });
        if (r.error) throw new Error(r.error.message ?? "Nieprawidłowy kod");
      }
      done();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function passkey() {
    setBusy(true);
    setError(null);
    const r = await authClient.signIn.passkey();
    if (r?.error) {
      setError(r.error.message ?? "Nie udało się potwierdzić passkeyem");
      setBusy(false);
      return;
    }
    done();
  }

  return (
    <div className="space-y-4">
      {hasTotp ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">{backup ? "Kod zapasowy" : t("code")}</Label>
            <Input
              id="code"
              inputMode={backup ? "text" : "numeric"}
              autoComplete="one-time-code"
              pattern={backup ? undefined : "[0-9]{6}"}
              maxLength={backup ? 20 : 6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="secret text-center text-lg tracking-[0.3em]"
              autoFocus
              required
            />
          </div>
          {mode === "challenge" ? (
            <div className="flex items-center gap-2">
              <Checkbox id="trust" checked={trust} onCheckedChange={(v) => setTrust(v === true)} />
              <Label htmlFor="trust" className="font-normal">{t("trustDevice")}</Label>
            </div>
          ) : null}
          <FormError message={error} />
          <Button type="submit" className="w-full" disabled={busy || !code}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} {t("verify")}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={() => (setBackup(!backup), setCode(""))}>
            {backup ? t("useTotp") : t("useBackup")}
          </Button>
        </form>
      ) : (
        <FormError message={error} />
      )}
      {hasPasskey ? (
        <Button variant="outline" className="w-full" onClick={passkey} disabled={busy}>
          <FingerprintPattern aria-hidden /> Potwierdź passkeyem
        </Button>
      ) : null}
    </div>
  );
}
