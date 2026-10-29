import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { syncVault } from "@/lib/dal/vault";

export async function GET() {
  return handle("vault.sync", async () => syncVault(await workspaceContext()));
}
