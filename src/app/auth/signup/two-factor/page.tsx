import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { db, schema } from "@/lib/db";
import { getAuthState } from "@/lib/dal/session";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Konfiguracja 2FA" };

/** Opcjonalne włączenie 2FA (aplikacja TOTP lub passkey) — uruchamiane z Ustawień → Bezpieczeństwo. */
export default async function RegisterTwoFactorPage({ searchParams }: PageProps<"/auth/signup/two-factor">) {
  const next = safeNext((await searchParams).next, "/dashboard/settings/security");
  const state = await getAuthState();
  if (!state) redirect(`/auth/signin?next=${encodeURIComponent("/auth/signup/two-factor")}`);
  // 2FA chroni całe konto Nexusa — nie wymaga skonfigurowanego sejfu.
  if (state.needsMfa) redirect(`/auth/signin/two-factor?next=${encodeURIComponent(next)}`);
  if (state.hasTotp) redirect(next);
  const accounts = await db.select({ providerId: schema.account.providerId }).from(schema.account).where(eq(schema.account.userId, state.user.id));
  return (
    <AuthCard title="Włącz weryfikację dwuetapową" description="Opcjonalne, ale zalecane — 2FA chroni konto nawet po wycieku hasła.">
      <TwoFactorSetup next={next} needsPassword={accounts.some((a) => a.providerId === "credential")} />
    </AuthCard>
  );
}
