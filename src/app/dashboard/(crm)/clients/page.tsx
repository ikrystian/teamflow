import { ClientsList } from "@/components/clients/clients-list";
import { PageHeader } from "@/components/layout/page-header";
import { listClients } from "@/lib/dal/clients";
import { requireUser, requireWorkspace } from "@/lib/dal/session";
import { listMembers } from "@/lib/dal/team";
import { canEditClients } from "@/lib/permissions";

export const metadata = { title: "Klienci" };

export default async function ClientsPage() {
  const ctx = await requireWorkspace();
  const state = await requireUser();
  const [clients, members] = await Promise.all([listClients(ctx), listMembers(ctx)]);
  return (
    <>
      <PageHeader title="Klienci" description={`${clients.length} klientów · liczba dostępów i ostrzeżenia przy każdym kliencie`} />
      <ClientsList
        clients={clients}
        members={members.map((m) => ({ userId: m.userId, name: m.name }))}
        canCreate={canEditClients(ctx.member)}
        me={ctx.userId}
        initialView={state.user.preferences.clientsView ?? "table"}
      />
    </>
  );
}
