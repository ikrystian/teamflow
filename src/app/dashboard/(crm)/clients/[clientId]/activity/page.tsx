import { ActivityTimeline } from "@/components/clients/timeline";
import { clientTimeline, getClient } from "@/lib/dal/clients";
import { orNotFound } from "@/lib/dal/load";
import { requireWorkspace } from "@/lib/dal/session";

export const metadata = { title: "Historia klienta" };

/** Oś czasu (rozdział 4.3): kto i kiedy coś zmienił. */
export default async function ClientActivityPage({ params }: PageProps<"/dashboard/clients/[clientId]/activity">) {
  const { clientId } = await params;
  const ctx = await requireWorkspace();
  await orNotFound(getClient(ctx, clientId));
  const events = await clientTimeline(ctx, clientId);
  return <ActivityTimeline events={events} />;
}
