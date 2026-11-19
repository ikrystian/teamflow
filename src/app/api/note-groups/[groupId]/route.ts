import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { noteGroupSelect, notesError, notesJson, parseBody, requireNotesUser, toNoteGroup } from "@/lib/notes/server"
import { updateNoteGroupSchema } from "@/lib/notes/validation"

type Ctx = { params: Promise<{ groupId: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireNotesUser()
    if (!auth.ok) return auth.response
    const { groupId } = await params

    const body = await parseBody(request, updateNoteGroupSchema)
    if (!body.ok) return body.response
    const { name, position } = body.data

    const { count } = await prisma.noteGroup.updateMany({
      where: { id: groupId, userId: auth.userId },
      data: { ...(name !== undefined && { name }), ...(position !== undefined && { position }), updatedAt: new Date() },
    })
    if (count === 0) return notesError("Nie znaleziono grupy", 404)

    const group = await prisma.noteGroup.findFirst({ where: { id: groupId, userId: auth.userId }, select: noteGroupSelect })
    if (!group) return notesError("Nie znaleziono grupy", 404)
    return notesJson({ group: toNoteGroup(group) })
  } catch (error) {
    console.error("Error updating note group:", error instanceof Error ? error.message : "unknown")
    return notesError("Internal server error", 500)
  }
}

// Usunięcie grupy nie kasuje notatek — trafiają do „Bez grupy”.
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireNotesUser()
    if (!auth.ok) return auth.response
    const { groupId } = await params

    const group = await prisma.noteGroup.findFirst({ where: { id: groupId, userId: auth.userId }, select: { id: true } })
    if (!group) return notesError("Nie znaleziono grupy", 404)

    const [moved] = await prisma.$transaction([
      prisma.note.updateMany({ where: { userId: auth.userId, groupId }, data: { groupId: null } }),
      prisma.noteGroup.deleteMany({ where: { id: groupId, userId: auth.userId } }),
    ])
    return notesJson({ success: true, movedNotes: moved.count })
  } catch (error) {
    console.error("Error deleting note group:", error instanceof Error ? error.message : "unknown")
    return notesError("Internal server error", 500)
  }
}
