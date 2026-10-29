import { ClientHeader } from "@/components/clients/client-header";
import { ClientTabs } from "@/components/clients/client-tabs";
import { getClient } from "@/lib/dal/clients";
import { orNotFound } from "@/lib/dal/load";
import { requireWorkspace } from "@/lib/dal/session";
import { listMembers } from "@/lib/dal/team";
import { projectCounts } from "@/lib/crm/projects";
import { canShareExternally } from "@/lib/permissions";

export default async function ClientLayout({ children, params }: LayoutProps<"/dashboard/clients/[clientId]">) {
  const { clientId } = await params;
  const ctx = await requireWorkspace();
  const client = await orNotFound(getClient(ctx, clientId));
  const [members, projects] = await Promise.all([listMembers(ctx), projectCounts([client.id])]);
  return (
    <>
      <ClientHeader
        client={{
          id: client.id,
          name: client.name,
          status: client.status,
          website: client.website,
          logo: client.logo,
          favorite: client.favorite,
          taxId: client.taxId,
          industry: client.industry,
          address: client.address,
          ownerUserId: client.ownerUserId,
          tags: client.tags,
          services: client.services,
        }}
        team={client.team.map((t) => ({ userId: t.userId, canViewCritical: t.canViewCritical }))}
        permissions={client.permissions}
        canShareExternal={canShareExternally(ctx.member, ctx.settings)}
        members={members.map((m) => ({ userId: m.userId, name: m.name, role: m.role }))}
        maxShareHours={ctx.settings.maxShareHours ?? 168}
      />
      <ClientTabs clientId={client.id} counts={{ ...client.counts, projects: projects.get(client.id) ?? 0 }} />
      <div className="pt-6">{children}</div>
    </>
  );
}
