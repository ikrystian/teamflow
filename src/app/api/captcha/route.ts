import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createChallenge } from "@/lib/security/captcha";

export async function GET() {
  return NextResponse.json(await createChallenge(env.CAPTCHA_SECRET), { headers: { "Cache-Control": "no-store" } });
}
