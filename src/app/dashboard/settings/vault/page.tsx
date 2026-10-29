import { Vault } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PreferencesForm } from "@/components/settings/vault-preferences";
import { VaultSecurity } from "@/components/settings/vault-security";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listUnlockKeys } from "@/lib/dal/account";
import { getAuthState } from "@/lib/dal/session";
import { isManagerRole } from "@/lib/roles";

export const metadata = { title: "Sejf" };

export default async function VaultSettingsPage() {
  const state = await getAuthState();
  if (!state) redirect("/auth/signin?next=/dashboard/settings/vault");
  if (isManagerRole(state.user.role)) notFound();
  if (!state.hasVault) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Vault className="size-4" aria-hidden /> Sejf nie jest skonfigurowany
          </CardTitle>
          <CardDescription>
            Sejf dostępów klientów jest szyfrowany end-to-end hasłem głównym, które nie opuszcza przeglądarki. Ustawisz je raz — dostaniesz też zestaw ratunkowy z kluczem odzyskiwania.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/auth/signup/vault?next=/dashboard/settings/vault">Skonfiguruj sejf</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  const prf = await listUnlockKeys(state.user.id);
  return (
    <div className="space-y-6">
      <PreferencesForm preferences={state.user.preferences} />
      <VaultSecurity prfKeys={prf.map((k) => ({ id: k.id, label: k.label, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt }))} email={state.user.email} name={state.user.name} />
    </div>
  );
}
