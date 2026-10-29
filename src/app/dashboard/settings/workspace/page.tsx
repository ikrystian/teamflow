import { WorkspaceSettingsForm } from "@/components/settings/workspace";
import { PLANS, workspaceSettings } from "@/lib/dal/account";
import { requireWorkspace } from "@/lib/dal/session";
import { canManageWorkspaceSettings } from "@/lib/permissions";

export const metadata = { title: "Przestrzeń" };

export default async function WorkspacePage() {
  const ctx = await requireWorkspace();
  const s = workspaceSettings(ctx.settings);
  return (
    <WorkspaceSettingsForm
      canEdit={canManageWorkspaceSettings(ctx.member)}
      name={ctx.workspaceName}
      plan={ctx.plan}
      plans={PLANS.map((p) => ({ ...p }))}
      settings={{ ...s, slackWebhookUrl: ctx.settings.slackWebhookUrl ?? "", teamsWebhookUrl: ctx.settings.teamsWebhookUrl ?? "" }}
    />
  );
}
