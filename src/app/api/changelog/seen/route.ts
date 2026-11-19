import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { getSession } from "@/lib/auth/session"
import { markChangelogSeen } from "@/lib/changelog"
import { changelogSeenSchema } from "@/lib/validation"

// POST /api/changelog/seen - użytkownik zobaczył popup „Co nowego” (do wskazanego wpisu włącznie)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { entryId } = changelogSeenSchema.parse(await request.json())
    if (!(await markChangelogSeen(session.user.id, entryId))) {
      return NextResponse.json({ error: "Nie znaleziono wpisu" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 })
    }
    console.error("Error marking changelog as seen:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
