import { NextResponse } from "next/server";
import { exportActivityCsv } from "@/lib/dal/activity";
import { DalError } from "@/lib/dal/errors";
import { workspaceContext } from "@/lib/dal/session";

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const csv = await exportActivityCsv(await workspaceContext(), {
      actor: sp.get("actor") ?? undefined,
      action: sp.get("action") ?? undefined,
      clientId: sp.get("client") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      q: sp.get("q") ?? undefined,
    });
    return new NextResponse(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dziennik-zdarzen-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof DalError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
