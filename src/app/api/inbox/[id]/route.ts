import { handle } from "@/lib/dal/http";
import { getSubmission } from "@/lib/dal/requests";
import { workspaceContext } from "@/lib/dal/session";

export async function GET(_req: Request, { params }: RouteContext<"/api/inbox/[id]">) {
  return handle("inbox.get", async () => getSubmission(await workspaceContext(), (await params).id));
}
