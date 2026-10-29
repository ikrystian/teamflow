import { ClientProjects } from "@/components/clients/client-projects";
import { getClient } from "@/lib/dal/clients";
import { orNotFound } from "@/lib/dal/load";
import { requireWorkspace } from "@/lib/dal/session";
import { isAdmin } from "@/lib/admin";
import { projectsForClient } from "@/lib/crm/projects";
import { seesAllClients } from "@/lib/permissions";

export const metadata = { title: "Projekty klienta" };

/** Zakładka „Projekty”: projekty i zadania z modułu projektów powiązane z klientem. */
export default async function ClientProjectsPage({ params }: PageProps<"/dashboard/clients/[clientId]/projects">) {
  const { clientId } = await params;
  const ctx = await requireWorkspace();
  const client = await orNotFound(getClient(ctx, clientId));
  const projects = await projectsForClient(clientId, { userId: ctx.userId, seesAll: seesAllClients(ctx.member) || (await isAdmin()) });
  return <ClientProjects clientId={client.id} clientName={client.name} projects={projects} />;
}
