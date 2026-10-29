import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { VaultSetup } from "@/components/auth/vault-setup";
import { getAuthState } from "@/lib/dal/session";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Hasło główne sejfu" };

export default async function RegisterVaultPage({ searchParams }: PageProps<"/auth/signup/vault">) {
  const next = safeNext((await searchParams).next);
  const state = await getAuthState();
  if (!state) redirect(`/auth/signin?next=${encodeURIComponent(next)}`);
  if (state.needsMfa) redirect(`/auth/signin/two-factor?next=${encodeURIComponent(next)}`);
  if (state.hasVault) redirect(state.memberships.length ? `/auth/unlock?next=${encodeURIComponent(next)}` : `/auth/signup/workspace?next=${encodeURIComponent(next)}`);
  return (
    <AuthCard
      title="Ustaw hasło główne sejfu"
      description="Sejf dostępów klientów jest szyfrowany end-to-end. Hasło główne nie opuszcza przeglądarki — na koniec otrzymasz zestaw ratunkowy z kluczem odzyskiwania."
    >
      <VaultSetup userId={state.user.id} email={state.user.email} name={state.user.name} next={next} />
    </AuthCard>
  );
}
