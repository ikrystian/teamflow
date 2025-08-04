import {  NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update lastReadAt for all user's chat rooms to current time
    await prisma.userChatRoom.updateMany({
      where: {
        userId: session.user.id
      },
      data: {
        lastReadAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking all chat rooms as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
