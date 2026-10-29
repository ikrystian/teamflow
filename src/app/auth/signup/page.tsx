import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getAuthState } from "@/lib/dal/session";
import { env } from "@/lib/env";
import { isFreshInstallation } from "@/lib/identity";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Rejestracja" };

export default async function RegisterPage({ searchParams }: PageProps<"/auth/signup">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const state = await getAuthState();
  if (state) redirect(next);
  const t = await getTranslations("auth");
  // Jedna organizacja: konto zakłada się z zaproszenia (wyjątek: pierwsze konto nowej instalacji).
  const open = env.DEPLOYMENT_MODE !== "single" || next.startsWith("/invite/") || (await isFreshInstallation());
  return (
    <AuthCard title={t("registerTitle")} description={t("registerSubtitle")}>
      {open ? (
        <RegisterForm next={next} inviteEmail={typeof sp.email === "string" ? sp.email : undefined} />
      ) : (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Nexus działa jako system jednej firmy — konto założysz z linku w zaproszeniu od administratora (Ustawienia → Zespół i dostęp do klientów).
          </p>
          <p>
            Masz już konto?{" "}
            <Link href={`/auth/signin?next=${encodeURIComponent(next)}`} className="font-medium underline-offset-4 hover:underline">
              Zaloguj się
            </Link>
          </p>
        </div>
      )}
    </AuthCard>
  );
}
