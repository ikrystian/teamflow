import { listNotifications } from "@/lib/dal/activity";
import { UnauthorizedError } from "@/lib/dal/errors";
import { handle } from "@/lib/dal/http";
import { getSession } from "@/lib/dal/session";

export async function GET() {
  return handle("notifications", async () => {
    const s = await getSession();
    if (!s) throw new UnauthorizedError();
    return listNotifications(s.user.id);
  });
}
