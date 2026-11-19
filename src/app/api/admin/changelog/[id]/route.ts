import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { getAdminSession } from "@/lib/admin"
import { deleteChangelogEntry, updateChangelogEntry } from "@/lib/changelog"
import { changelogUpdateSchema } from "@/lib/validation"

// PATCH /api/admin/changelog/[id] - edycja, publikacja lub cofnięcie publikacji (admin only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { id } = await params
    const input = changelogUpdateSchema.parse(await request.json())
    const entry = await updateChangelogEntry(id, input)
    if (!entry) {
      return NextResponse.json({ error: "Nie znaleziono wpisu" }, { status: 404 })
    }
    return NextResponse.json({ entry })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Nieprawidłowe dane" }, { status: 400 })
    }
    console.error("Error updating changelog entry:", error)
    return NextResponse.json({ error: "Nie udało się zapisać wpisu" }, { status: 500 })
  }
}

// DELETE /api/admin/changelog/[id] - usunięcie wpisu (admin only)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { id } = await params
    if (!(await deleteChangelogEntry(id))) {
      return NextResponse.json({ error: "Nie znaleziono wpisu" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error deleting changelog entry:", error)
    return NextResponse.json({ error: "Nie udało się usunąć wpisu" }, { status: 500 })
  }
}
