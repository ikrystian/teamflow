import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { lookupNip } from "@/lib/integrations/nip";
import { hit } from "@/lib/security/rate-limit";
import { ValidationError, ForbiddenError } from "@/lib/dal/errors";

export async function GET(_req: Request, { params }: RouteContext<"/api/nip/[nip]">) {
  return handle("nip.lookup", async () => {
    const ctx = await workspaceContext();
    if (!(await hit(`nip:${ctx.userId}`, 30, 3600)).allowed) throw new ForbiddenError("Zbyt wiele zapytań");
    try {
      return await lookupNip((await params).nip);
    } catch (e) {
      throw new ValidationError((e as Error).message);
    }
  });
}
