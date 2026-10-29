import { NotesEditor } from "@/components/clients/notes-editor";
import { getClient } from "@/lib/dal/clients";
import { orNotFound } from "@/lib/dal/load";
import { requireWorkspace } from "@/lib/dal/session";

export const metadata = { title: "Notatki klienta" };

export default async function NotesPage({ params }: PageProps<"/dashboard/clients/[clientId]/notes">) {
  const { clientId } = await params;
  const ctx = await requireWorkspace();
  const client = await orNotFound(getClient(ctx, clientId));
  return <NotesEditor clientId={clientId} initial={client.notes} canEdit={client.permissions.canEditCrm} />;
}
