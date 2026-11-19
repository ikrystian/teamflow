import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  noteGroupSelect,
  noteSelect,
  noteSummarySelect,
  notesError,
  notesJson,
  parseBody,
  requireNotesUser,
  toNote,
  toNoteGroup,
  toNoteSummary,
} from "@/lib/notes/server"
import { htmlToExcerpt } from "@/lib/notes/text"
import { createNoteSchema, MAX_NOTES_PER_USER } from "@/lib/notes/validation"

// Prywatne notatki z prawego panelu. Lista zawiera tylko metadane i podgląd —
// pełną treść pobiera GET /api/notes/[noteId] przy otwarciu notatki.
export async function GET() {
  try {
    const auth = await requireNotesUser()
    if (!auth.ok) return auth.response

    const [groups, notes] = await Promise.all([
      prisma.noteGroup.findMany({
        where: { userId: auth.userId },
        select: noteGroupSelect,
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      prisma.note.findMany({
        where: { userId: auth.userId },
        select: noteSummarySelect,
        orderBy: { updatedAt: "desc" },
      }),
    ])

    return notesJson({ groups: groups.map(toNoteGroup), notes: notes.map(toNoteSummary) })
  } catch (error) {
    console.error("Error listing notes:", error instanceof Error ? error.message : "unknown")
    return notesError("Internal server error", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireNotesUser()
    if (!auth.ok) return auth.response

    const body = await parseBody(request, createNoteSchema)
    if (!body.ok) return body.response
    const { groupId = null, title = "", content = "" } = body.data

    if (groupId) {
      const group = await prisma.noteGroup.findFirst({ where: { id: groupId, userId: auth.userId }, select: { id: true } })
      if (!group) return notesError("Nie znaleziono grupy", 404)
    }

    const count = await prisma.note.count({ where: { userId: auth.userId } })
    if (count >= MAX_NOTES_PER_USER) return notesError(`Możesz mieć najwyżej ${MAX_NOTES_PER_USER} notatek`, 409)

    const note = await prisma.note.create({
      // Jawny null — filtry Mongo nie dopasowują braku pola.
      data: { userId: auth.userId, groupId, title, content, excerpt: htmlToExcerpt(content) },
      select: noteSelect,
    })
    return notesJson({ note: toNote(note) }, 201)
  } catch (error) {
    // Nie logujemy treści notatki — tylko komunikat błędu.
    console.error("Error creating note:", error instanceof Error ? error.message : "unknown")
    return notesError("Internal server error", 500)
  }
}
