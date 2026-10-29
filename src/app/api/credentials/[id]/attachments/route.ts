import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { addAttachment, listAttachments } from "@/lib/dal/vault";
import { attachmentSchema } from "@/lib/validation";

export async function GET(_req: Request, { params }: RouteContext<"/api/credentials/[id]/attachments">) {
  return handle("attachments.list", async () => listAttachments(await workspaceContext(), (await params).id));
}

/** Przesłanie zaszyfrowanego załącznika (szyfrowany w przeglądarce kluczem wpisu). */
export async function POST(req: Request, { params }: RouteContext<"/api/credentials/[id]/attachments">) {
  return handle("attachments.add", async () => {
    const input = attachmentSchema.parse(await req.json());
    if (input.credentialId !== (await params).id) throw new Error("Niezgodny wpis");
    await addAttachment(await workspaceContext(), input);
    return { id: input.id };
  });
}
