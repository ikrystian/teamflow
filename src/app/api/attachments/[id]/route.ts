import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { deleteAttachment, getAttachment } from "@/lib/dal/vault";

export async function GET(_req: Request, { params }: RouteContext<"/api/attachments/[id]">) {
  return handle("attachment.get", async () => getAttachment(await workspaceContext(), (await params).id));
}

export async function DELETE(_req: Request, { params }: RouteContext<"/api/attachments/[id]">) {
  return handle("attachment.delete", async () => deleteAttachment(await workspaceContext(), (await params).id));
}
