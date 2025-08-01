import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// Funkcja do wysyłania powiadomień push (placeholder - wymaga web-push library)
async function sendPushNotification(subscription: any, payload: any) {
  // W rzeczywistej implementacji użyj biblioteki web-push
  console.log('Sending push notification:', { subscription, payload })
  
  // Placeholder - w produkcji zaimplementuj rzeczywiste wysyłanie
  return Promise.resolve()
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId, title, body } = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    // Pobierz zadanie i sprawdź uprawnienia
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { assigneeId: session.user.id },
          { createdById: session.user.id }
        ]
      },
      include: {
        assignee: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 })
    }

    // Pobierz subskrypcje użytkownika przypisanego do zadania
    const targetUserId = task.assigneeId || task.createdById
    if (!targetUserId) {
      return NextResponse.json({ error: "No user to notify" }, { status: 400 })
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: targetUserId
      }
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        message: "No push subscriptions found for user",
        sent: 0 
      })
    }

    // Przygotuj payload powiadomienia
    const payload = {
      title: title || `Przypomnienie: ${task.title}`,
      body: body || `Zadanie "${task.title}" wymaga Twojej uwagi`,
      taskId: task.id,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    }

    // Wyślij powiadomienia do wszystkich subskrypcji użytkownika
    let sentCount = 0
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        await sendPushNotification({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        }, payload)
        sentCount++
      } catch (error) {
        console.error('Failed to send push notification:', error)
        // Usuń nieprawidłową subskrypcję
        await prisma.pushSubscription.delete({
          where: { id: subscription.id }
        }).catch(() => {})
      }
    })

    await Promise.all(sendPromises)

    return NextResponse.json({ 
      message: "Push notifications sent",
      sent: sentCount,
      total: subscriptions.length
    })
  } catch (error) {
    console.error("Error sending push notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
