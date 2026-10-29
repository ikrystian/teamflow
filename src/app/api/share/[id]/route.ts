import { headers } from "next/headers";
import { handle } from "@/lib/dal/http";
import { consumeShare, publicShareMeta } from "@/lib/dal/shares";
import { metaFromHeaders } from "@/lib/request-meta";
import { shareViewSchema } from "@/lib/validation";

/** Metadane linku (bez zużywania wyświetlenia). */
export async function GET(_req: Request, { params }: RouteContext<"/api/share/[id]">) {
  return handle("share.meta", async () => publicShareMeta((await params).id));
}

/** Wydanie szyfrogramu po okazaniu klucza dostępu — zalicza wyświetlenie. */
export async function POST(req: Request, { params }: RouteContext<"/api/share/[id]">) {
  return handle("share.consume", async () => {
    const { accessKey } = shareViewSchema.parse(await req.json());
    return consumeShare((await params).id, accessKey, metaFromHeaders(await headers()));
  });
}
