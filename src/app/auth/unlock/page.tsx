import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { UnlockForm } from "@/components/auth/unlock-form";
import { listUnlockKeys } from "@/lib/dal/account";
import { getAuthState, nextSetupStep } from "@/lib/dal/session";
import { sessionAgeMs } from "@/lib/format";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Odblokuj sejf" };

export default async function UnlockPage({ searchParams }: PageProps<"/auth/unlock">) {
  const next = safeNext((await searchParams).next);
  const state = await getAuthState();
  if (!state) redirect(`/auth/signin?next=${encodeURIComponent(next)}`);
  const step = nextSetupStep(state);
  if (step && step !== "/auth/signup/workspace") redirect(step);
  if (step === "/auth/signup/workspace" && !next.startsWith("/invite/")) redirect(step);
  const t = await getTranslations("vault");
  const prf = (await listUnlockKeys(state.user.id)).filter((k) => k.keysVersion === state.user.keysVersion);
  const inTeam = state.memberships.some((m) => m.role !== "owner") || state.memberships.length > 1;
  const freshSession = !state.needsMfa && sessionAgeMs(state.session.createdAt) < 10 * 60_000;
  return (
    <AuthCard title={t("unlockTitle")} description={t("unlockSubtitle")}>
      <UnlockForm next={next} email={state.user.email} name={state.user.name} inTeam={inTeam} freshSession={freshSession} prfKeys={prf} />
    </AuthCard>
  );
}
