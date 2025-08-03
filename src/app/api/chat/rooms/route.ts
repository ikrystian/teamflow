import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user exists in the database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id
          }
        }
      },
      include: {
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
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(chatRooms)
  } catch (error) {
    console.error('Error fetching chat rooms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user exists in the database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    const { name, type, memberIds } = await request.json()

    if (type === 'direct' && memberIds.length !== 1) {
      return NextResponse.json(
        { error: 'Direct messages must have exactly one other member' },
        { status: 400 }
      )
    }

    const chatRoom = await prisma.chatRoom.create({
      data: {
        name,
        type,
        createdById: session.user.id,
        members: {
          create: [
            { userId: session.user.id },
            ...memberIds.map((memberId: string) => ({ userId: memberId }))
          ]
        }
      },
      include: {
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(chatRoom, { status: 201 })
  } catch (error) {
    console.error('Error creating chat room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}