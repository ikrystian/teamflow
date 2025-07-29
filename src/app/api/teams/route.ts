import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            id: session.user.id
          }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true,

          }
        }
      }
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      )
    }

    const team = await prisma.team.create({
      data: {
        name,
        members: {
          connect: {
            id: session.user.id
          }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
