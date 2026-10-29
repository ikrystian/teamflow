import { ContactsManager } from "@/components/clients/contacts";
import { getClient, listContacts } from "@/lib/dal/clients";
import { orNotFound } from "@/lib/dal/load";
import { requireWorkspace } from "@/lib/dal/session";

export const metadata = { title: "Kontakty klienta" };

export default async function ContactsPage({ params }: PageProps<"/dashboard/clients/[clientId]/contacts">) {
  const { clientId } = await params;
  const ctx = await requireWorkspace();
  const client = await orNotFound(getClient(ctx, clientId));
  const contacts = await listContacts(ctx, clientId);
  return <ContactsManager clientId={clientId} contacts={contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }))} canEdit={client.permissions.canEditCrm} />;
}
