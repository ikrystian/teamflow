import { DomainsManager } from "@/components/clients/domains";
import { getClient, listDomains } from "@/lib/dal/clients";
import { orNotFound } from "@/lib/dal/load";
import { requireWorkspace } from "@/lib/dal/session";

export const metadata = { title: "Domeny i hosting" };

export default async function DomainsPage({ params }: PageProps<"/dashboard/clients/[clientId]/domains">) {
  const { clientId } = await params;
  const ctx = await requireWorkspace();
  const client = await orNotFound(getClient(ctx, clientId));
  const domains = await listDomains(ctx, clientId);
  return <DomainsManager clientId={clientId} domains={domains} canEdit={client.permissions.canEditCrm} />;
}
