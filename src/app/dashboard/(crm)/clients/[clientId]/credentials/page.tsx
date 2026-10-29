import { CredentialsView } from "@/components/vault/credentials-view";
import { workspaceSettings } from "@/lib/dal/account";
import { getClient } from "@/lib/dal/clients";
import { orNotFound } from "@/lib/dal/load";
import { requireUser, requireWorkspace } from "@/lib/dal/session";
import { canShareExternally } from "@/lib/permissions";

export const metadata = { title: "Dostępy klienta" };

/** Zakładka „Dostępy” (rozdział 5.2): login widać od razu, hasło zostaje zamaskowane. */
export default async function ClientCredentialsPage({ params }: PageProps<"/dashboard/clients/[clientId]/credentials">) {
  const { clientId } = await params;
  const ctx = await requireWorkspace();
  const state = await requireUser();
  await orNotFound(getClient(ctx, clientId));
  const s = workspaceSettings(ctx.settings);
  return (
    <CredentialsView
      clientId={clientId}
      canShareExternal={canShareExternally(ctx.member, ctx.settings)}
      maxShareHours={s.maxShareHours}
      passwordMaxAgeDays={s.passwordMaxAgeDays}
      initialView={state.user.preferences.vaultView ?? "table"}
    />
  );
}
