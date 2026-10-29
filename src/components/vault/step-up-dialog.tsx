"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { FingerprintPattern, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStepUp } from "@/lib/vault/step-up";
import { deriveAuthKeyForStepUp } from "@/lib/vault/store";
import { stepUpMasterAction, stepUpPasskeyOptionsAction, stepUpPasskeyVerifyAction } from "@/server/actions/account";

/** Ponowne potwierdzenie tożsamości: hasło główne (bez wysyłania go na serwer) albo passkey. */
export function StepUpDialog() {
  const { open, reason, done, cancel } = useStepUp();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withMaster(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const authKey = await deriveAuthKeyForStepUp(password);
      const r = await stepUpMasterAction(authKey);
      if (!r.ok) throw new Error(r.error);
      setPassword("");
      done();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function withPasskey() {
    setBusy(true);
    setError(null);
    try {
      const opts = await stepUpPasskeyOptionsAction();
      if (!opts.ok) throw new Error(opts.error);
      const response = await startAuthentication({ optionsJSON: opts.data });
      const r = await stepUpPasskeyVerifyAction(response);
      if (!r.ok) throw new Error(r.error);
      done();
    } catch (err) {
      setError((err as Error).name === "NotAllowedError" ? "Anulowano potwierdzenie passkeyem" : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && (setPassword(""), setError(null), cancel())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" aria-hidden /> Potwierdź tożsamość
          </DialogTitle>
          <DialogDescription>
            {reason ? `${reason} wymaga ponownego potwierdzenia.` : "Ta operacja wymaga ponownego potwierdzenia."} Potwierdzenie jest ważne 5 minut.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={withMaster} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="stepup-master">Hasło główne</Label>
            <Input id="stepup-master" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={withPasskey} disabled={busy}>
              <FingerprintPattern aria-hidden /> Użyj passkeya
            </Button>
            <Button type="submit" disabled={busy || !password}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Potwierdź
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
