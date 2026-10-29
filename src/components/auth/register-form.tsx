"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { registerSchema } from "@/lib/validation";
import { FormError } from "./auth-card";

export function RegisterForm({ next, inviteEmail }: { next: string; inviteEmail?: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: inviteEmail ?? "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError(null);
    const r = await authClient.signUp.email({ ...parsed.data, callbackURL: "/dashboard" });
    if (r.error) {
      setError(r.error.code === "USER_ALREADY_EXISTS" || r.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ? "Konto z tym adresem już istnieje — zaloguj się" : (r.error.message ?? "Nie udało się założyć konta"));
      setBusy(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" autoComplete="name" value={form.name} onChange={set("name")} required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required readOnly={Boolean(inviteEmail)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} required minLength={12} aria-describedby="password-hint" />
        <p id="password-hint" className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} {t("register")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href={`/auth/signin?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("login")}
        </Link>
      </p>
    </form>
  );
}
