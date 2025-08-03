import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 401 })
    }

    // Log the logout action
    console.log(`User ${session.user?.email} logged out at ${new Date().toISOString()}`)

    // You can add additional cleanup logic here:
    // - Clear user-specific cache
    // - Log logout events
    // - Clean up any temporary data
    // - Invalidate refresh tokens if using them

    // Create response that clears NextAuth cookies
    const response = NextResponse.json({ 
      message: "Logout successful",
      redirectUrl: "/auth/signin"
    })

    // Clear NextAuth cookies
    const cookiesToClear = [
      "next-auth.session-token",
      "next-auth.csrf-token", 
      "next-auth.callback-url",
      "__Secure-next-auth.session-token",
      "__Host-next-auth.csrf-token"
    ]

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      })
    })

    return response
  } catch (error) {
    console.error("Logout API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}