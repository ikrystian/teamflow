import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { credentialVersions } from "@/lib/dal/vault";

export async function GET(_req: Request, { params }: RouteContext<"/api/credentials/[id]/versions">) {
  return handle("credential.versions", async () => credentialVersions(await workspaceContext(), (await params).id));
}
