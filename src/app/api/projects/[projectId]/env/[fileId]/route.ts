import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { decryptEnv, encryptEnv } from "@/lib/project-env/crypto"
import { countEnvVariables } from "@/lib/project-env/parse"
import { getEnvKey, requireEnvAccess } from "@/lib/project-env/access"
import { updateEnvFileSchema } from "@/lib/project-env/validation"

type RouteContext = { params: Promise<{ projectId: string; fileId: string }> }

const NO_STORE = { "Cache-Control": "no-store" }
const fileNotFound = () => NextResponse.json({ error: "Env file not found" }, { status: 404 })

// Odszyfrowana treść pliku — wołane tylko na żądanie (Pokaż, Kopiuj, Pobierz, Edytuj).
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId, fileId } = await params
    const access = await requireEnvAccess(projectId)
    if (!access.ok) return access.response

    const file = await prisma.projectEnvFile.findFirst({ where: { id: fileId, projectId: access.projectId } })
    if (!file) return fileNotFound()

    let content: string
    try {
      content = decryptEnv(file.ciphertext, access.projectId, getEnvKey())
    } catch {
      // Zwykle zmieniony ENV_ENCRYPTION_KEY (lub BETTER_AUTH_SECRET, z którego klucz jest wyprowadzany).
      return NextResponse.json(
        { error: "Nie udało się odszyfrować pliku. Sprawdź, czy klucz ENV_ENCRYPTION_KEY nie został zmieniony." },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { file: { id: file.id, name: file.name, varCount: file.varCount, updatedAt: file.updatedAt, content } },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error("Error reading project env file:", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Failed to read env file" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId, fileId } = await params
    const access = await requireEnvAccess(projectId)
    if (!access.ok) return access.response

    const body = await request.json().catch(() => null)
    const parsed = updateEnvFileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" }, { status: 400 })
    }
    const { name, content } = parsed.data

    const existing = await prisma.projectEnvFile.findFirst({
      where: { id: fileId, projectId: access.projectId },
      select: { id: true },
    })
    if (!existing) return fileNotFound()

    try {
      const file = await prisma.projectEnvFile.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(content !== undefined
            ? { ciphertext: encryptEnv(content, access.projectId, getEnvKey()), varCount: countEnvVariables(content) }
            : {}),
          updatedById: access.session.user.id,
        },
        select: { id: true, name: true, varCount: true, createdAt: true, updatedAt: true },
      })
      return NextResponse.json({ file }, { headers: NO_STORE })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: `Plik „${name}” już istnieje w tym projekcie` }, { status: 409 })
      }
      throw error
    }
  } catch (error) {
    console.error("Error updating project env file:", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Failed to update env file" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId, fileId } = await params
    const access = await requireEnvAccess(projectId)
    if (!access.ok) return access.response

    const { count } = await prisma.projectEnvFile.deleteMany({ where: { id: fileId, projectId: access.projectId } })
    if (count === 0) return fileNotFound()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project env file:", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Failed to delete env file" }, { status: 500 })
  }
}
