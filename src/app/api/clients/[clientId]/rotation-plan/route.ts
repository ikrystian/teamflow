import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { rotationPlan } from "@/lib/dal/vault";

export async function GET(_req: Request, { params }: RouteContext<"/api/clients/[clientId]/rotation-plan">) {
  return handle("client.rotation_plan", async () => rotationPlan(await workspaceContext(), (await params).clientId));
}
