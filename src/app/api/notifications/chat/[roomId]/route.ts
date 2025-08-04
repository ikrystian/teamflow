import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await params

    // Check if user is member of this chat room
    const userChatRoom = await prisma.userChatRoom.findFirst({
      where: {
        userId: session.user.id,
        chatRoomId: roomId
      }
    })

    if (!userChatRoom) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get chat room with latest message
    const chatRoom = await prisma.chatRoom.findUnique({
      where: {
        id: roomId
      },
      include: {
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
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!chatRoom || chatRoom.messages.length === 0) {
      return NextResponse.json({ error: 'No messages found' }, { status: 404 })
    }

    // Count unread messages
    const unreadCount = await prisma.message.count({
      where: {
        chatRoomId: roomId,
        senderId: {
          not: session.user.id // Don't count own messages
        },
        createdAt: userChatRoom.lastReadAt ? {
          gt: userChatRoom.lastReadAt
        } : undefined
      }
    })

    if (unreadCount === 0) {
      return NextResponse.json({ notification: null, unreadCount: 0 })
    }

    const lastMessage = chatRoom.messages[0]

    // Get chat room display name
    let chatRoomName = chatRoom.name
    if (chatRoom.type === 'direct') {
      // For direct messages, get the other user's name
      const otherMember = await prisma.userChatRoom.findFirst({
        where: {
          chatRoomId: roomId,
          userId: {
            not: session.user.id
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
      chatRoomName = otherMember?.user.name || otherMember?.user.email || 'Użytkownik'
    } else if (chatRoom.type === 'project' && chatRoom.project) {
      chatRoomName = `${chatRoom.project.name} - Czat Projektu`
    }

    const notification = {
      id: `${chatRoom.id}-${lastMessage.id}`,
      chatRoomId: chatRoom.id,
      chatRoomName,
      chatRoomType: chatRoom.type,
      senderId: lastMessage.senderId,
      senderName: lastMessage.sender.name,
      senderAvatar: lastMessage.sender.avatarUrl,
      content: lastMessage.content,
      createdAt: lastMessage.createdAt.toISOString(),
      unreadCount
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Error fetching chat room notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
