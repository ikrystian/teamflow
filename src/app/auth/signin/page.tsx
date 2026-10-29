import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthState } from "@/lib/dal/session";
import { socialProviders } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Logowanie" };

export default async function LoginPage({ searchParams }: PageProps<"/auth/signin">) {
  const next = safeNext((await searchParams).next);
  const state = await getAuthState();
  if (state) redirect(state.needsMfa ? `/auth/signin/two-factor?next=${encodeURIComponent(next)}` : next);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("loginTitle")} description={t("loginSubtitle")}>
      <LoginForm next={next} social={socialProviders} />
    </AuthCard>
  );
}
