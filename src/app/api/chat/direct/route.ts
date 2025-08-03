import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the current user exists in the database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot create direct message with yourself' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        type: 'direct',
        members: {
          every: {
            userId: {
              in: [session.user.id, userId]
            }
          }
        },
        AND: [
          {
            members: {
              some: {
                userId: session.user.id
              }
            }
          },
          {
            members: {
              some: {
                userId: userId
              }
            }
          }
        ]
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
        }
      }
    })

    if (existingRoom) {
      return NextResponse.json(existingRoom)
    }

    const chatRoom = await prisma.chatRoom.create({
      data: {
        type: 'direct',
        createdById: session.user.id,
        members: {
          create: [
            { userId: session.user.id },
            { userId: userId }
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
        }
      }
    })

    return NextResponse.json(chatRoom, { status: 201 })
  } catch (error) {
    console.error('Error creating direct message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}