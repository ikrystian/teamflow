import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { testSMTPConnection } from "@/lib/email"

// POST /api/admin/smtp-settings/test - Testuj połączenie SMTP (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const isConnectionValid = await testSMTPConnection()

    if (isConnectionValid) {
      return NextResponse.json({
        success: true,
        message: "Połączenie SMTP działa poprawnie"
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Nie udało się nawiązać połączenia SMTP. Sprawdź ustawienia."
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Error testing SMTP connection:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Wystąpił błąd podczas testowania połączenia SMTP"
    }, { status: 500 })
  }
}
