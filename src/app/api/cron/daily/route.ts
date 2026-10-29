import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runDailyJobs } from "@/lib/jobs";

/**
 * Zadania dzienne modułu klientów i sejfu (przypomnienia, retencja dziennika, SSL).
 * Wywoływane z crona systemowego z nagłówkiem Authorization: Bearer CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET nie jest skonfigurowany" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runDailyJobs());
}
