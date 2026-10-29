import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { exportVaultBundle } from "@/lib/dal/vault";

export async function POST() {
  return handle("vault.export", async () => exportVaultBundle(await workspaceContext()));
}
