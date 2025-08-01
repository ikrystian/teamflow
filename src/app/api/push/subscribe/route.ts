import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscription = await request.json()

    // Sprawdź czy subskrypcja już istnieje
    const existingSubscription = await prisma.pushSubscription.findFirst({
      where: {
        userId: session.user.id,
        endpoint: subscription.endpoint
      }
    })

    if (existingSubscription) {
      return NextResponse.json({ 
        message: "Subscription already exists",
        subscription: existingSubscription 
      })
    }

    // Utwórz nową subskrypcję
    const newSubscription = await prisma.pushSubscription.create({
      data: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: request.headers.get('user-agent') || undefined
      }
    })

    return NextResponse.json({ 
      message: "Subscription created successfully",
      subscription: newSubscription 
    })
  } catch (error) {
    console.error("Error creating push subscription:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
