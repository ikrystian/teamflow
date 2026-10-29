"use client";

import { FingerprintPattern, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth/client";
import { FormError } from "./auth-card";
import { solveCaptcha } from "./captcha";

export function LoginForm({ next, social }: { next: string; social: { google: boolean; microsoft: boolean } }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "password" | "passkey" | "captcha">(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(captcha?: string): Promise<void> {
    const res = await authClient.signIn.email({ email, password, fetchOptions: { headers: captcha ? { "x-captcha-solution": captcha } : {} } });
    if (res.error) {
      if (res.error.code === "CAPTCHA_REQUIRED" && !captcha) {
        setBusy("captcha");
        return signIn(await solveCaptcha());
      }
      if (res.error.code === "ACCOUNT_LOCKED" || res.error.status === 429) throw new Error(t("locked"));
      throw new Error(res.error.code === "INVALID_EMAIL_OR_PASSWORD" ? t("invalid") : (res.error.message ?? t("invalid")));
    }
    if ((res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      router.push(`/auth/signin/two-factor?next=${encodeURIComponent(next)}`);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    setError(null);
    try {
      await signIn();
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  async function passkey() {
    setBusy("passkey");
    setError(null);
    const res = await authClient.signIn.passkey();
    if (res?.error) {
      setError(res.error.message ?? "Nie udało się zalogować passkeyem");
      setBusy(null);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" type="email" autoComplete="username webauthn" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("password")}</Label>
            <Link href="/auth/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              {t("forgot")}
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <FormError message={error} />
        {busy === "captcha" ? <p className="text-sm text-muted-foreground" aria-live="polite">{t("captcha")}</p> : null}
        <Button type="submit" className="w-full" disabled={Boolean(busy) || !email || !password}>
          {busy === "password" || busy === "captcha" ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t("login")}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" /> {t("or")} <Separator className="flex-1" />
      </div>
      <div className="grid gap-2">
        <Button variant="outline" onClick={passkey} disabled={Boolean(busy)}>
          {busy === "passkey" ? <Loader2 className="animate-spin" aria-hidden /> : <FingerprintPattern aria-hidden />} {t("loginPasskey")}
        </Button>
        {social.google ? (
          <Button variant="outline" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: `/auth/signin/two-factor?next=${encodeURIComponent(next)}` })}>
            {t("loginGoogle")}
          </Button>
        ) : null}
        {social.microsoft ? (
          <Button variant="outline" onClick={() => authClient.signIn.social({ provider: "microsoft", callbackURL: `/auth/signin/two-factor?next=${encodeURIComponent(next)}` })}>
            {t("loginMicrosoft")}
          </Button>
        ) : null}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href={`/auth/signup?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("register")}
        </Link>
      </p>
    </div>
  );
}
