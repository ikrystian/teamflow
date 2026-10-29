import Link from "next/link";
import { PublicShell } from "@/components/public/public-shell";
import { AcceptInvite } from "@/components/public/accept-invite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthState, nextSetupStep } from "@/lib/dal/session";
import { findInvitation } from "@/lib/dal/team";
import { ROLE_LABELS } from "@/lib/permissions";

export const metadata = { title: "Zaproszenie", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const inv = await findInvitation(token);
  const state = await getAuthState();
  const here = `/invite/${token}`;
  if (!inv) {
    return (
      <PublicShell>
        <Card>
          <CardHeader>
            <CardTitle>Zaproszenie nieaktywne</CardTitle>
            <CardDescription>Zaproszenie wygasło, zostało anulowane albo już je przyjęto. Poproś administratora o nowe.</CardDescription>
          </CardHeader>
        </Card>
      </PublicShell>
    );
  }
  const step = state ? nextSetupStep(state) : null;
  return (
    <PublicShell>
      <Card>
        <CardHeader>
          <CardTitle>Dołącz do „{inv.workspaceName}”</CardTitle>
          <CardDescription>
            {inv.invitedByName ?? "Administrator"} zaprasza Cię w roli: {ROLE_LABELS[inv.role]}. Zaproszenie dla: {inv.email}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!state ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/auth/signup?next=${encodeURIComponent(here)}&email=${encodeURIComponent(inv.email)}`}>Załóż konto</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/auth/signin?next=${encodeURIComponent(here)}`}>Mam konto — zaloguj</Link>
              </Button>
            </div>
          ) : state.user.email.toLowerCase() !== inv.email.toLowerCase() ? (
            <p className="text-sm text-destructive">Jesteś zalogowany(-a) jako {state.user.email}. Zaloguj się na konto {inv.email}, aby przyjąć zaproszenie.</p>
          ) : step && step !== "/auth/signup/workspace" ? (
            <Button asChild>
              <Link href={`${step}?next=${encodeURIComponent(here)}`}>Dokończ konfigurację konta</Link>
            </Button>
          ) : (
            <AcceptInvite token={token} />
          )}
        </CardContent>
      </Card>
    </PublicShell>
  );
}
