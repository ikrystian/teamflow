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

    // Usuń subskrypcję z bazy danych
    await prisma.pushSubscription.deleteMany({
      where: {
        userId: session.user.id,
        endpoint: subscription.endpoint
      }
    })

    return NextResponse.json({ 
      message: "Subscription removed successfully" 
    })
  } catch (error) {
    console.error("Error removing push subscription:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
