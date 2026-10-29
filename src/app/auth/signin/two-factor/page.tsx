import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { TwoFactorForm } from "@/components/auth/two-factor-form";
import { getAuthState } from "@/lib/dal/session";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Weryfikacja dwuetapowa" };

export default async function TwoFactorPage({ searchParams }: PageProps<"/auth/signin/two-factor">) {
  const next = safeNext((await searchParams).next);
  const t = await getTranslations("auth");
  const state = await getAuthState();
  if (state) {
    if (!state.needsMfa) redirect(next);
    return (
      <AuthCard title={t("twoFactorTitle")} description={state.hasTotp ? t("twoFactorSubtitle") : "Potwierdź logowanie passkeyem przypisanym do konta."}>
        <TwoFactorForm mode="session" hasTotp={state.hasTotp} hasPasskey={state.passkeyCount > 0} next={next} />
      </AuthCard>
    );
  }
  const jar = await cookies();
  const pending = jar.getAll().some((c) => c.name.endsWith("two_factor"));
  if (!pending) redirect("/auth/signin");
  return (
    <AuthCard title={t("twoFactorTitle")} description={t("twoFactorSubtitle")}>
      <TwoFactorForm mode="challenge" hasTotp hasPasskey={false} next={next} />
    </AuthCard>
  );
}
