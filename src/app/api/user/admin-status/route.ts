import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import type { Session } from "next-auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminStatus = await isAdmin()

    return NextResponse.json({ 
      isAdmin: adminStatus,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      }
    })
  } catch (error) {
    console.error("Error checking admin status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
