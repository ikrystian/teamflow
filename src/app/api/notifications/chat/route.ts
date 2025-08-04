import {  NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all chat rooms where user is a member
    const userChatRooms = await prisma.userChatRoom.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        chatRoom: {
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
        }
      }
    })

    const notifications = []
    let totalUnread = 0

    for (const userChatRoom of userChatRooms) {
      const { chatRoom, lastReadAt } = userChatRoom

      // Count unread messages
      const unreadCount = await prisma.message.count({
        where: {
          chatRoomId: chatRoom.id,
          senderId: {
            not: session.user.id // Don't count own messages
          },
          createdAt: lastReadAt ? {
            gt: lastReadAt
          } : undefined
        }
      })

      if (unreadCount > 0 && chatRoom.messages.length > 0) {
        const lastMessage = chatRoom.messages[0]

        // Get chat room display name
        let chatRoomName = chatRoom.name
        if (chatRoom.type === 'direct') {
          // For direct messages, get the other user's name
          const otherMember = await prisma.userChatRoom.findFirst({
            where: {
              chatRoomId: chatRoom.id,
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

        notifications.push({
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
        })

        totalUnread += unreadCount
      }
    }

    // Sort notifications by last message time (newest first)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      notifications,
      totalUnread
    })
  } catch (error) {
    console.error('Error fetching chat notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
