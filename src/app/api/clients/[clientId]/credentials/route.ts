import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { clientCredentials } from "@/lib/dal/vault";

/** Wpisy klienta. Nieprzypisany członek zespołu dostaje 404 (kryterium akceptacji 3). */
export async function GET(_req: Request, { params }: RouteContext<"/api/clients/[clientId]/credentials">) {
  return handle("client.credentials", async () => clientCredentials(await workspaceContext(), (await params).clientId));
}
