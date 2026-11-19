import "server-only"
import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getSession } from "@/lib/auth/session"
import type { AppSession } from "@/lib/auth/types"
import { prisma } from "@/lib/prisma"
import { isSystemAdmin } from "@/lib/roles"

/** Klucz AES-256 do plików .env (patrz `ENV_ENCRYPTION_KEY` w src/lib/env.ts). */
export function getEnvKey(): Buffer {
  return Buffer.from(env.ENV_ENCRYPTION_KEY, "base64")
}

export type EnvAccess =
  | { ok: true; session: AppSession; projectId: string }
  | { ok: false; response: NextResponse }

/**
 * Dostęp do plików .env projektu: administrator systemu, twórca projektu albo jego członek.
 * Reszta zalogowanych dostaje 404 (nie 403), żeby nie dowiedzieć się, że projekt ma sekrety.
 * To celowo ostrzejsza reguła niż dla reszty projektu — pozostałe trasy projektu są dziś
 * otwarte dla każdego zalogowanego użytkownika, a tu leżą sekrety.
 */
export async function requireEnvAccess(projectId: string): Promise<EnvAccess> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const notFound = { ok: false, response: NextResponse.json({ error: "Project not found" }, { status: 404 }) } as const

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, createdById: true, members: { where: { userId: session.user.id }, select: { id: true } } },
  })
  if (!project) return notFound

  const allowed =
    isSystemAdmin(session.user.role, session.user.email) ||
    project.createdById === session.user.id ||
    project.members.length > 0
  if (!allowed) return notFound

  return { ok: true, session, projectId: project.id }
}
