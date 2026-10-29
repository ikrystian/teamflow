import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { credentialTeamShares } from "@/lib/dal/team";

export async function GET(_req: Request, { params }: RouteContext<"/api/credentials/[id]/team">) {
  return handle("credential.team", async () => credentialTeamShares(await workspaceContext(), (await params).id));
}
