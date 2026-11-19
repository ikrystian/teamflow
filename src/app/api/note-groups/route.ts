import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { noteGroupSelect, notesError, notesJson, parseBody, requireNotesUser, toNoteGroup } from "@/lib/notes/server"
import { createNoteGroupSchema, MAX_NOTE_GROUPS_PER_USER } from "@/lib/notes/validation"

// Grupy prywatnych notatek. Lista grup przychodzi razem z notatkami z GET /api/notes.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireNotesUser()
    if (!auth.ok) return auth.response

    const body = await parseBody(request, createNoteGroupSchema)
    if (!body.ok) return body.response

    const count = await prisma.noteGroup.count({ where: { userId: auth.userId } })
    if (count >= MAX_NOTE_GROUPS_PER_USER) return notesError(`Możesz mieć najwyżej ${MAX_NOTE_GROUPS_PER_USER} grup`, 409)

    // Nowa grupa trafia na koniec listy.
    const group = await prisma.noteGroup.create({
      data: { userId: auth.userId, name: body.data.name, position: count },
      select: noteGroupSelect,
    })
    return notesJson({ group: toNoteGroup(group) }, 201)
  } catch (error) {
    console.error("Error creating note group:", error instanceof Error ? error.message : "unknown")
    return notesError("Internal server error", 500)
  }
}
