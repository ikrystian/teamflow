import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { getAdminSession } from "@/lib/admin"
import { createChangelogEntry, listChangelogEntries } from "@/lib/changelog"
import { changelogCreateSchema } from "@/lib/validation"

// GET /api/admin/changelog - wszystkie wpisy changelogu, ze szkicami (admin only)
export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    return NextResponse.json({ entries: await listChangelogEntries() })
  } catch (error) {
    console.error("Error fetching changelog:", error)
    return NextResponse.json({ error: "Nie udało się pobrać wpisów changelogu" }, { status: 500 })
  }
}

// POST /api/admin/changelog - nowy wpis (szkic albo od razu opublikowany)
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const input = changelogCreateSchema.parse(await request.json())
    const entry = await createChangelogEntry(session.user.id, input)
    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Nieprawidłowe dane" }, { status: 400 })
    }
    console.error("Error creating changelog entry:", error)
    return NextResponse.json({ error: "Nie udało się zapisać wpisu" }, { status: 500 })
  }
}
