import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { listShares } from "@/lib/dal/shares";

export async function GET(req: Request) {
  return handle("shares.list", async () => {
    const sp = new URL(req.url).searchParams;
    return listShares(await workspaceContext(), { credentialId: sp.get("credential") ?? undefined, clientId: sp.get("client") ?? undefined });
  });
}
