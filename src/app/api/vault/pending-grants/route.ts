import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { pendingGrants } from "@/lib/dal/vault";

export async function GET() {
  return handle("vault.pending", async () => pendingGrants(await workspaceContext()));
}
