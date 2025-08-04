import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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

    // Update lastReadAt to current time
    await prisma.userChatRoom.update({
      where: {
        id: userChatRoom.id
      },
      data: {
        lastReadAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking chat room as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
