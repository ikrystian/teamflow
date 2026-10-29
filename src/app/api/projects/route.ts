import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { AppSession as Session } from "@/lib/auth/types"
import { isAssignableClient, withClientRef, withClientRefs } from "@/lib/crm/directory"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession() as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get("includeArchived") === "true"
    const archivedOnly = searchParams.get("archivedOnly") === "true"

    // Określ warunki filtrowania na podstawie parametrów
    let archivedCondition = {}
    if (archivedOnly) {
      archivedCondition = { archived: true }
    } else if (!includeArchived) {
      archivedCondition = { archived: false }
    }
    // Jeśli includeArchived=true i archivedOnly=false, nie dodajemy warunków archived

    const projects = await prisma.project.findMany({
      where: {
        ...archivedCondition,
        OR: [

          // Projects where user is a direct project member
          {
            members: {
              some: {
                userId: session.user.id
              }
            }
          },
          // Projects created by the user
          {
            createdById: session.user.id
          }
        ]
      },
      orderBy: { sortOrder: "asc" },
      include: {

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        tasks: {
          where: { deletedAt: null, archived: false }, // hide soft-deleted tasks
          select: {
            id: true,
            title: true,
            statusId: true,
            taskStatus: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ projects: await withClientRefs(projects) })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession() as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, imageUrl, color, icon, clientId } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    if (clientId && !(await isAssignableClient(session.user.id, clientId))) {
      return NextResponse.json({ error: "Nieprawidłowy klient" }, { status: 400 })
    }

    // Create the project with the creator as the owner
    const result = await prisma.project.create({
      data: {
        name,
        description,
        createdById: session.user.id,
        imageUrl,
        color: color || "#3B82F6",
        icon,
        clientId: clientId || null,
        // Automatically add creator as project member
        members: {
          create: {
            userId: session.user.id,
            role: "admin"
          }
        }
      },
      include: {

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ project: await withClientRef(result) }, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
