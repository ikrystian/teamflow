import {  NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"

// GET /api/admin/smtp-settings - Pobierz ustawienia SMTP z .env (admin only)
export async function GET() {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    // Pobierz ustawienia ze zmiennych środowiskowych
    const settings = {
      smtp_host: process.env.SMTP_HOST || "",
      smtp_port: process.env.SMTP_PORT || "587",
      smtp_secure: process.env.SMTP_SECURE === "true",
      smtp_user: process.env.SMTP_USER || "",
      smtp_password: process.env.SMTP_PASSWORD ? "••••••••" : "", // Ukryj hasło
      smtp_from_email: process.env.SMTP_FROM_EMAIL || "",
      smtp_from_name: process.env.SMTP_FROM_NAME || "Nexus"
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching SMTP settings:", error)
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania ustawień SMTP" },
      { status: 500 }
    )
  }
}


