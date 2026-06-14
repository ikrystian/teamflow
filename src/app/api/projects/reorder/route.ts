import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// PATCH /api/projects/reorder  body: { orderedIds: string[] }
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderedIds } = await request.json()

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds must be a non-empty array" }, { status: 400 })
    }

    // Verify user has access to all projects in the list
    const accessible = await prisma.project.findMany({
      where: {
        id: { in: orderedIds },
        OR: [
          { members: { some: { userId: session.user.id } } },
          { createdById: session.user.id },
        ],
      },
      select: { id: true },
    })

    const accessibleIds = new Set(accessible.map((p) => p.id))
    const unauthorized = orderedIds.filter((id: string) => !accessibleIds.has(id))
    if (unauthorized.length > 0) {
      return NextResponse.json({ error: "Unauthorized for some projects" }, { status: 403 })
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.project.update({ where: { id }, data: { sortOrder: index } })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error reordering projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
