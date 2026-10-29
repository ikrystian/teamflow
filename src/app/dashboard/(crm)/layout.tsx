import { Lock, ShieldOff } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { VaultGate } from "@/components/layout/vault-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentPath, getAuthState, requireWorkspace } from "@/lib/dal/session";
import { env } from "@/lib/env";
import { orgWorkspaceId } from "@/lib/identity";
import { isManagerRole, isSystemAdmin } from "@/lib/roles";

/**
 * Moduł klientów i sejfu: wymaga skonfigurowanego sejfu (hasło główne), przynależności do
 * przestrzeni CRM i odblokowanego sejfu. Autoryzacja i tak odbywa się w każdym zapytaniu DAL.
 */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const state = await getAuthState();
  const path = await currentPath();
  if (!state) redirect(`/auth/signin?next=${encodeURIComponent(path)}`);
  if (isManagerRole(state.user.role)) notFound();
  const next = `?next=${encodeURIComponent(path)}`;

  if (!state.memberships.length) {
    // Jedna organizacja: przestrzeń zakłada raz administrator, pozostali dołączają automatycznie.
    if (env.DEPLOYMENT_MODE === "single") {
      // Przestrzeń organizacji już istnieje, a osoba nie ma w niej miejsca (np. zawieszona).
      if (await orgWorkspaceId()) return <ModuleNotice title="Brak dostępu do modułu klientów" description="Poproś administratora o dodanie do zespołu w Ustawienia → Zespół i dostęp do klientów." />;
      if (!isSystemAdmin(state.user.role, state.user.email)) {
        return <ModuleNotice title="Moduł klientów nie jest jeszcze skonfigurowany" description="Administrator musi raz skonfigurować sejf organizacji. Po tym zobaczysz tu klientów, do których masz dostęp." />;
      }
    }
    redirect(state.hasVault ? `/auth/signup/workspace${next}` : `/auth/signup/vault${next}`);
  }
  if (!state.hasVault) redirect(`/auth/signup/vault${next}`);
  await requireWorkspace();

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
      <Suspense>
        <VaultGate>{children}</VaultGate>
      </Suspense>
    </div>
  );
}

function ModuleNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto w-full max-w-xl p-4 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {title.startsWith("Brak") ? <ShieldOff className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />} {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Wróć do panelu</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
