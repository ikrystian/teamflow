import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import webpush from 'web-push'

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:fasolqa@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

interface PushNotificationPayload {
  type: 'chat_message' | 'task_reminder'
  title: string
  body: string
  data?: {
    chatRoomId?: string
    senderId?: string
    taskId?: string
    [key: string]: string | number | boolean | undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if VAPID keys are configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({
        error: 'Push notifications not configured'
      }, { status: 503 })
    }

    const payload: PushNotificationPayload = await request.json()

    // Get all push subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: session.user.id
      }
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({
        message: 'No push subscriptions found for user'
      }, { status: 200 })
    }

    // Prepare notification payload
    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: payload.data || {},
      actions: payload.type === 'chat_message' ? [
        {
          action: 'view',
          title: 'Zobacz wiadomość'
        },
        {
          action: 'dismiss',
          title: 'Odrzuć'
        }
      ] : [
        {
          action: 'view',
          title: 'Zobacz zadanie'
        },
        {
          action: 'dismiss',
          title: 'Odrzuć'
        }
      ],
      requireInteraction: true,
      tag: payload.type === 'chat_message'
        ? `chat-${payload.data?.chatRoomId}`
        : `task-${payload.data?.taskId}`
    }

    // Send notifications to all user's devices
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        }

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        )

        return { success: true, subscriptionId: subscription.id }
      } catch (error) {
        console.error('Error sending push notification:', error)

        // If subscription is invalid, remove it from database
        if (error instanceof Error && (
          error.message.includes('410') ||
          error.message.includes('invalid') ||
          error.message.includes('expired')
        )) {
          await prisma.pushSubscription.delete({
            where: { id: subscription.id }
          }).catch(console.error)
        }

        return {
          success: false,
          subscriptionId: subscription.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    const results = await Promise.all(sendPromises)

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Push notifications sent`,
      successCount,
      failureCount,
      results
    })
  } catch (error) {
    console.error('Error in push notification API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
