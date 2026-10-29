import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { clientDirectory } from "@/lib/crm/directory"
import { isManagerRole } from "@/lib/roles"

/**
 * GET /api/clients — katalog klientów CRM do przypisywania projektów.
 * Zwraca wyłącznie metadane; pełna karta klienta i sejf są w module klientów.
 * Klientów tworzy się w CRM (/dashboard/clients) — każdy klient dostaje tam własny klucz sejfu.
 */
export async function GET() {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // "manager" to rola osób z zewnątrz (ograniczony dostęp do zadań) — bez wglądu w bazę klientów
    if (isManagerRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const clients = await clientDirectory(session.user.id)
    return NextResponse.json({ clients })
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
