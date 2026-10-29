import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { WorkspaceCreate } from "@/components/auth/workspace-create";
import { getAuthState } from "@/lib/dal/session";
import { env } from "@/lib/env";
import { legacyClients, orgWorkspaceId } from "@/lib/identity";
import { isSystemAdmin } from "@/lib/roles";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Przestrzeń klientów" };

export default async function RegisterWorkspacePage({ searchParams }: PageProps<"/auth/signup/workspace">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const state = await getAuthState();
  if (!state) redirect(`/auth/signin?next=${encodeURIComponent(next)}`);
  if (state.needsMfa) redirect(`/auth/signin/two-factor?next=${encodeURIComponent(next)}`);
  if (!state.hasVault) redirect(`/auth/signup/vault?next=${encodeURIComponent(next)}`);
  if (next.startsWith("/invite/")) redirect(next);
  const single = env.DEPLOYMENT_MODE === "single";
  const adding = sp.new === "1" && !single;
  if (state.memberships.length && !adding) redirect(`/auth/unlock?next=${encodeURIComponent(next)}`);

  if (single) {
    const org = await orgWorkspaceId();
    if (org || !isSystemAdmin(state.user.role, state.user.email)) {
      return (
        <AuthCard title="Moduł klientów" description="Przestrzeń klientów i sejfu organizacji konfiguruje administrator.">
          <p className="text-sm text-muted-foreground">
            {org ? "Organizacja jest już skonfigurowana — poproś administratora o dodanie do zespołu." : "Administrator musi raz skonfigurować sejf organizacji."}{" "}
            <Link href="/dashboard" className="underline">Wróć do panelu</Link>
          </p>
        </AuthCard>
      );
    }
    const toImport = (await legacyClients()).length;
    return (
      <AuthCard title="Skonfiguruj klientów i sejf organizacji" description="Jedna przestrzeń dla całej firmy: baza klientów (CRM) i zaszyfrowany sejf dostępów.">
        <div className="space-y-6">
          <WorkspaceCreate publicKey={state.user.publicKey!} next={next} defaultName={env.ORG_NAME} />
          <ul className="list-disc space-y-1 rounded-md bg-muted p-3 pl-7 text-sm text-muted-foreground">
            <li>Wszyscy użytkownicy Nexusa dołączą do przestrzeni (administratorzy jako administratorzy, pozostali jako członkowie bez dostępu do klientów, dopóki ich nie przypiszesz).</li>
            {toImport ? <li>{toImport} {toImport === 1 ? "klient" : "klientów"} z modułu projektów trafi do CRM, a projekty zostaną z nimi połączone.</li> : null}
            <li>Klucze sejfów klientów zostaną utworzone w Twojej przeglądarce przy pierwszym odblokowaniu sejfu.</li>
          </ul>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={adding ? "Nowa przestrzeń" : "Utwórz przestrzeń roboczą"} description="Przestrzeń to Twoja działalność lub agencja. Jedno konto może należeć do kilku przestrzeni.">
      <div className="space-y-6">
        <WorkspaceCreate publicKey={state.user.publicKey!} next={adding ? "/dashboard" : next} />
        {!adding ? (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Dołączasz do istniejącej agencji? Otwórz link z zaproszenia, które dostałeś(-aś) e-mailem — po jego przyjęciu nie musisz tworzyć własnej przestrzeni.{" "}
            <Link href="/legal/security" className="underline">Jak chronimy dane?</Link>
          </p>
        ) : null}
      </div>
    </AuthCard>
  );
}
