import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // Sprawdź autoryzację (opcjonalnie - może być chronione kluczem API)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    
    // Znajdź zadania z aktywnym przypomnieniem, które powinny zostać wysłane
    const tasksToRemind = await prisma.task.findMany({
      where: {
        reminderEnabled: true,
        reminderTime: {
          lte: now
        },
        // Sprawdź czy zadanie nie zostało już ukończone
        taskStatus: {
          name: {
            not: "Done" // Dostosuj do nazw statusów w Twojej aplikacji
          }
        }
      },
      include: {
        assignee: {
          include: {
            pushSubscriptions: true
          }
        },
        createdBy: {
          include: {
            pushSubscriptions: true
          }
        },
        taskStatus: true
      }
    })

    console.log(`Found ${tasksToRemind.length} tasks to remind`)

    let notificationsSent = 0
    
    for (const task of tasksToRemind) {
      try {
        // Określ kogo powiadomić (przypisanego użytkownika lub twórcę)
        const userToNotify = task.assignee || task.createdBy
        
        if (!userToNotify || !userToNotify.pushSubscriptions.length) {
          console.log(`No user or subscriptions for task ${task.id}`)
          continue
        }

        // Przygotuj payload powiadomienia
        const payload = {
          title: `Przypomnienie: ${task.title}`,
          body: task.dueDate 
            ? `Zadanie ma termin: ${new Date(task.dueDate).toLocaleDateString('pl-PL')}`
            : 'Zadanie wymaga Twojej uwagi',
          taskId: task.id,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        }

        // Wyślij powiadomienia do wszystkich subskrypcji użytkownika
        for (const subscription of userToNotify.pushSubscriptions) {
          try {
            // Tutaj powinna być implementacja rzeczywistego wysyłania push notification
            // Na razie tylko logujemy
            console.log('Would send notification:', {
              endpoint: subscription.endpoint,
              payload
            })
            notificationsSent++
          } catch (error) {
            console.error('Failed to send notification:', error)
            
            // Usuń nieprawidłową subskrypcję
            await prisma.pushSubscription.delete({
              where: { id: subscription.id }
            }).catch(() => {})
          }
        }

        // Wyłącz przypomnienie dla tego zadania (aby nie wysyłać wielokrotnie)
        await prisma.task.update({
          where: { id: task.id },
          data: {
            reminderEnabled: false,
            reminderTime: null
          }
        })

      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error)
      }
    }

    return NextResponse.json({
      message: "Reminders checked successfully",
      tasksProcessed: tasksToRemind.length,
      notificationsSent
    })

  } catch (error) {
    console.error("Error checking reminders:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Endpoint GET do testowania
export async function GET() {
  try {
    const now = new Date()
    
    const tasksWithReminders = await prisma.task.findMany({
      where: {
        reminderEnabled: true,
        reminderTime: {
          not: null
        }
      },
      select: {
        id: true,
        title: true,
        reminderTime: true,
        dueDate: true,
        assignee: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    const upcomingReminders = tasksWithReminders.filter(task => 
      task.reminderTime && new Date(task.reminderTime) > now
    )

    const overdueReminders = tasksWithReminders.filter(task => 
      task.reminderTime && new Date(task.reminderTime) <= now
    )

    return NextResponse.json({
      now: now.toISOString(),
      totalReminders: tasksWithReminders.length,
      upcomingReminders: upcomingReminders.length,
      overdueReminders: overdueReminders.length,
      tasks: tasksWithReminders
    })

  } catch (error) {
    console.error("Error getting reminders status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
