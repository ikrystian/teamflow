import { InboxList } from "@/components/vault/inbox";
import { PageHeader } from "@/components/layout/page-header";
import { listAccessRequests } from "@/lib/dal/requests";
import { requireWorkspace } from "@/lib/dal/session";

export const metadata = { title: "Do przejrzenia" };

export default async function InboxPage() {
  const ctx = await requireWorkspace();
  const requests = await listAccessRequests(ctx);
  return (
    <>
      <PageHeader title="Do przejrzenia" description="Dostępy przekazane przez klientów bezpiecznym formularzem. Po akceptacji trafiają do sejfu klienta." />
      <InboxList requests={requests} />
    </>
  );
}
