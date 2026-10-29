import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { memberPublicKeys } from "@/lib/dal/team";

export async function GET() {
  return handle("members.keys", async () => memberPublicKeys(await workspaceContext()));
}
