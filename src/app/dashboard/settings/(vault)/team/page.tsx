import { TeamSettings } from "@/components/settings/team";
import { listClients } from "@/lib/dal/clients";
import { requireWorkspace } from "@/lib/dal/session";
import { listInvitations, listMembers } from "@/lib/dal/team";
import { canManageMembers } from "@/lib/permissions";

export const metadata = { title: "Zespół" };

export default async function TeamPage() {
  const ctx = await requireWorkspace();
  const [members, invitations, clients] = await Promise.all([listMembers(ctx), listInvitations(ctx), listClients(ctx)]);
  return (
    <TeamSettings
      members={members}
      invitations={invitations}
      clients={clients.map((c) => ({ id: c.id, name: c.name, ownerUserId: c.ownerUserId }))}
      me={ctx.userId}
      myRole={ctx.member.role}
      canManage={canManageMembers(ctx.member)}
    />
  );
}
