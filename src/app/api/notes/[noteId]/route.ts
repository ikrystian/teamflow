import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { noteSelect, notesError, notesJson, parseBody, requireNotesUser, toNote } from "@/lib/notes/server"
import { htmlToExcerpt } from "@/lib/notes/text"
import { updateNoteSchema } from "@/lib/notes/validation"

type Ctx = { params: Promise<{ noteId: string }> }

// Cudza notatka zwraca 404 (nie 403), żeby nie zdradzać, że istnieje.
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireNotesUser()
    if (!auth.ok) return auth.response
    const { noteId } = await params

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: auth.userId }, select: noteSelect })
    if (!note) return notesError("Nie znaleziono notatki", 404)
    return notesJson({ note: toNote(note) })
  } catch (error) {
    console.error("Error fetching note:", error instanceof Error ? error.message : "unknown")
    return notesError("Internal server error", 500)
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireNotesUser()
    if (!auth.ok) return auth.response
    const { noteId } = await params

    const body = await parseBody(request, updateNoteSchema)
    if (!body.ok) return body.response
    const { groupId, title, content } = body.data

    if (groupId) {
      const group = await prisma.noteGroup.findFirst({ where: { id: groupId, userId: auth.userId }, select: { id: true } })
      if (!group) return notesError("Nie znaleziono grupy", 404)
    }

    const { count } = await prisma.note.updateMany({
      where: { id: noteId, userId: auth.userId },
      data: {
        ...(groupId !== undefined && { groupId }),
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content, excerpt: htmlToExcerpt(content) }),
        updatedAt: new Date(),
      },
    })
    if (count === 0) return notesError("Nie znaleziono notatki", 404)

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: auth.userId }, select: noteSelect })
    if (!note) return notesError("Nie znaleziono notatki", 404)
    return notesJson({ note: toNote(note) })
  } catch (error) {
    console.error("Error updating note:", error instanceof Error ? error.message : "unknown")
    return notesError("Internal server error", 500)
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireNotesUser()
    if (!auth.ok) return auth.response
    const { noteId } = await params

    const { count } = await prisma.note.deleteMany({ where: { id: noteId, userId: auth.userId } })
    if (count === 0) return notesError("Nie znaleziono notatki", 404)
    return notesJson({ success: true })
  } catch (error) {
    console.error("Error deleting note:", error instanceof Error ? error.message : "unknown")
    return notesError("Internal server error", 500)
  }
}
