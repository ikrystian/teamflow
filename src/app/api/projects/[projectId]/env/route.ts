import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { encryptEnv } from "@/lib/project-env/crypto"
import { countEnvVariables } from "@/lib/project-env/parse"
import { getEnvKey, requireEnvAccess } from "@/lib/project-env/access"
import { createEnvFileSchema } from "@/lib/project-env/validation"

// Lista plików .env projektu — tylko metadane. Treść jest odszyfrowywana dopiero
// przez GET /env/[fileId], żeby sekrety nie szły do przeglądarki bez potrzeby.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const access = await requireEnvAccess(projectId)
    if (!access.ok) return access.response

    const files = await prisma.projectEnvFile.findMany({
      where: { projectId: access.projectId },
      select: { id: true, name: true, varCount: true, createdAt: true, updatedAt: true, updatedById: true },
      orderBy: { name: "asc" },
    })

    const editorIds = [...new Set(files.map((f) => f.updatedById))]
    const editors = editorIds.length
      ? await prisma.user.findMany({ where: { id: { in: editorIds } }, select: { id: true, name: true, email: true } })
      : []
    const editorById = new Map(editors.map((u) => [u.id, u]))

    return NextResponse.json(
      {
        files: files.map(({ updatedById, ...file }) => {
          const editor = editorById.get(updatedById)
          return { ...file, updatedBy: editor ? { id: editor.id, name: editor.name ?? editor.email } : null }
        }),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Error listing project env files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const access = await requireEnvAccess(projectId)
    if (!access.ok) return access.response

    const body = await request.json().catch(() => null)
    const parsed = createEnvFileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" }, { status: 400 })
    }
    const { name, content } = parsed.data

    try {
      const file = await prisma.projectEnvFile.create({
        data: {
          projectId: access.projectId,
          name,
          ciphertext: encryptEnv(content, access.projectId, getEnvKey()),
          varCount: countEnvVariables(content),
          createdById: access.session.user.id,
          updatedById: access.session.user.id,
        },
        select: { id: true, name: true, varCount: true, createdAt: true, updatedAt: true },
      })
      return NextResponse.json({ file }, { status: 201 })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: `Plik „${name}” już istnieje w tym projekcie` }, { status: 409 })
      }
      throw error
    }
  } catch (error) {
    // Nigdy nie logujemy treści pliku — tylko komunikat błędu.
    console.error("Error creating project env file:", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Failed to create env file" }, { status: 500 })
  }
}
