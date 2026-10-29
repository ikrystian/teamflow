import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { isAdmin } from "@/lib/admin"
import type { AppSession as Session } from "@/lib/auth/types"

export async function GET() {
  try {
    const session = await getSession() as Session | null

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
