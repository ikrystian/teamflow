import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { editClientSchema } from "@/lib/client-validations"
import type { Session } from "next-auth"

function emptyToNull(value?: string | null) {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { clientId } = await params

    const client = await prisma.client.findUnique({
      where: { id: clientId },
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

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { clientId } = await params

    const existing = await prisma.client.findUnique({ where: { id: clientId } })
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const body = await request.json()
    const validation = editClientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Nieprawidłowe dane" },
        { status: 400 }
      )
    }

    const data = validation.data

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: data.name,
        contactPerson: emptyToNull(data.contactPerson),
        email: emptyToNull(data.email),
        phone: emptyToNull(data.phone),
        website: emptyToNull(data.website),
        address: emptyToNull(data.address),
        taxId: emptyToNull(data.taxId),
        notes: emptyToNull(data.notes),
      },
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

    return NextResponse.json({ client })
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { clientId } = await params

    const existing = await prisma.client.findUnique({ where: { id: clientId } })
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Odłącz klienta od projektów (clientId -> null), a następnie usuń klienta.
    // Dzięki temu projekty nie są usuwane razem z klientem.
    await prisma.project.updateMany({
      where: { clientId },
      data: { clientId: null },
    })

    await prisma.client.delete({ where: { id: clientId } })

    return NextResponse.json({ message: "Client deleted" })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
