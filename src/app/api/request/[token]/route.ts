import { headers } from "next/headers";
import { handle } from "@/lib/dal/http";
import { publicRequest, submitPublicRequest } from "@/lib/dal/requests";
import { metaFromHeaders } from "@/lib/request-meta";
import { intakeSubmitSchema } from "@/lib/validation";

export async function GET(_req: Request, { params }: RouteContext<"/api/request/[token]">) {
  return handle("request.meta", async () => publicRequest((await params).token));
}

/** Klient agencji przesyła dostępy zaszyfrowane w swojej przeglądarce. */
export async function POST(req: Request, { params }: RouteContext<"/api/request/[token]">) {
  return handle("request.submit", async () => {
    const input = intakeSubmitSchema.parse(await req.json());
    await submitPublicRequest((await params).token, input, metaFromHeaders(await headers()));
    return { ok: true };
  });
}
