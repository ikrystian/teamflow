import { z } from "zod";
import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { revealSecrets } from "@/lib/dal/vault";

const body = z.object({ purpose: z.enum(["reveal", "copy", "edit", "totp", "share", "move", "export"]).default("reveal") });

/** Sekrety wpisu krytycznego — tylko po step-up, z wpisem w dzienniku. */
export async function POST(req: Request, { params }: RouteContext<"/api/credentials/[id]/secrets">) {
  return handle("credential.secrets", async () => {
    const { purpose } = body.parse(await req.json().catch(() => ({})));
    return revealSecrets(await workspaceContext(), (await params).id, purpose);
  });
}
