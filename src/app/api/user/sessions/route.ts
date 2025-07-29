import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get all active sessions for the user
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        expires: {
          gt: new Date(), // Only active sessions
        },
      },
      select: {
        id: true,
        sessionToken: true,
        expires: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Parse user agent to get device/browser info
    const sessionsWithDeviceInfo = sessions.map(session => {
      const userAgent = session.userAgent || ""
      let deviceInfo = "Nieznane urządzenie"
      let browserInfo = "Nieznana przeglądarka"

      // Simple user agent parsing
      if (userAgent.includes("Chrome")) {
        browserInfo = "Chrome"
      } else if (userAgent.includes("Firefox")) {
        browserInfo = "Firefox"
      } else if (userAgent.includes("Safari")) {
        browserInfo = "Safari"
      } else if (userAgent.includes("Edge")) {
        browserInfo = "Edge"
      }

      if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
        deviceInfo = "Urządzenie mobilne"
      } else if (userAgent.includes("Windows")) {
        deviceInfo = "Windows"
      } else if (userAgent.includes("Mac")) {
        deviceInfo = "macOS"
      } else if (userAgent.includes("Linux")) {
        deviceInfo = "Linux"
      }

      return {
        id: session.id,
        sessionToken: session.sessionToken,
        expires: session.expires,
        ipAddress: session.ipAddress || "Nieznany",
        deviceInfo,
        browserInfo,
        createdAt: session.createdAt,
        isCurrent: false, // We'll determine this on the client side
      }
    })

    return NextResponse.json({ sessions: sessionsWithDeviceInfo })
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const action = searchParams.get("action") // "single" or "others"

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (action === "others") {
      // Delete all sessions except current one
      // Note: We can't easily identify the current session with JWT strategy
      // So we'll delete all sessions and let the user re-login
      await prisma.session.deleteMany({
        where: {
          userId: user.id,
        },
      })

      return NextResponse.json({
        message: "Wszystkie sesje zostały zakończone. Zaloguj się ponownie."
      })
    } else if (sessionId) {
      // Delete specific session
      const deletedSession = await prisma.session.deleteMany({
        where: {
          id: sessionId,
          userId: user.id, // Ensure user can only delete their own sessions
        },
      })

      if (deletedSession.count === 0) {
        return NextResponse.json(
          { error: "Sesja nie została znaleziona" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        message: "Sesja została zakończona"
      })
    } else {
      return NextResponse.json(
        { error: "Brak wymaganego parametru sessionId lub action" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error deleting session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
