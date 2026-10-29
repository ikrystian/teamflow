"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { PasswordInput } from "@/components/vault/password-input";
import { FormError } from "./auth-card";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await authClient.requestPasswordReset({ email, redirectTo: "/auth/reset-password" });
    setBusy(false);
    setSent(true);
  }
  if (sent) return <p className="text-sm">Jeśli konto istnieje, wysłaliśmy link na adres {email}. Sprawdź skrzynkę.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Adres e-mail</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </div>
      <Button type="submit" className="w-full" disabled={busy || !email}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Wyślij link
      </Button>
      <Link href="/auth/signin" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">Wróć do logowania</Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await authClient.resetPassword({ newPassword: pw, token });
    setBusy(false);
    if (r.error) return setError(r.error.message ?? "Link wygasł lub jest nieprawidłowy");
    setDone(true);
  }
  if (!token) return <FormError message="Brak tokenu w linku." />;
  if (done)
    return (
      <p className="text-sm">
        Hasło konta zostało zmienione. <Link href="/auth/signin" className="underline">Zaloguj się</Link>.
      </p>
    );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pw">Nowe hasło konta</Label>
        <PasswordInput id="pw" value={pw} onChange={setPw} required minLength={12} />
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={busy || pw.length < 12}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Ustaw hasło
      </Button>
    </form>
  );
}
