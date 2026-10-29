import { NextResponse } from "next/server";
import { exportWorkspaceData } from "@/lib/dal/account";
import { DalError } from "@/lib/dal/errors";
import { workspaceContext } from "@/lib/dal/session";

/** Eksport danych przestrzeni na żądanie (RODO). */
export async function GET() {
  try {
    const data = await exportWorkspaceData(await workspaceContext());
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="nexus-dane-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof DalError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    throw e;
  }
}
