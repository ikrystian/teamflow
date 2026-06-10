import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createClientSchema } from "@/lib/client-validations"
import type { Session } from "next-auth"

// Zamienia puste stringi na null, żeby nie zapisywać "" w bazie
function emptyToNull(value?: string | null) {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        projects: {
          select: { id: true, name: true, color: true, archived: true },
        },
        _count: { select: { projects: true } },
      },
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = createClientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Nieprawidłowe dane" },
        { status: 400 }
      )
    }

    const data = validation.data

    const client = await prisma.client.create({
      data: {
        name: data.name,
        contactPerson: emptyToNull(data.contactPerson),
        email: emptyToNull(data.email),
        phone: emptyToNull(data.phone),
        website: emptyToNull(data.website),
        address: emptyToNull(data.address),
        taxId: emptyToNull(data.taxId),
        notes: emptyToNull(data.notes),
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        _count: { select: { projects: true } },
      },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
