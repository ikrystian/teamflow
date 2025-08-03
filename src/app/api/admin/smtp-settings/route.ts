import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

// GET /api/admin/smtp-settings - Pobierz ustawienia SMTP (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password', 'smtp_from_email', 'smtp_from_name']
        }
      }
    })

    // Konwertuj na obiekt z kluczami jako właściwościami
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value || ""
      return acc
    }, {} as Record<string, string>)

    // Ustaw domyślne wartości jeśli nie ma ustawień
    const defaultSettings = {
      smtp_host: "",
      smtp_port: "587",
      smtp_secure: "false",
      smtp_user: "",
      smtp_password: "",
      smtp_from_email: "",
      smtp_from_name: "TeamFlow"
    }

    const result = { ...defaultSettings, ...settingsObject }
    
    // Konwertuj smtp_secure na boolean dla frontendu
    return NextResponse.json({
      ...result,
      smtp_secure: result.smtp_secure === "true"
    })
  } catch (error) {
    console.error("Error fetching SMTP settings:", error)
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania ustawień SMTP" },
      { status: 500 }
    )
  }
}

// POST /api/admin/smtp-settings - Zapisz ustawienia SMTP (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const {
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_password,
      smtp_from_email,
      smtp_from_name
    } = body

    // Walidacja wymaganych pól
    if (!smtp_host || !smtp_port || !smtp_user || !smtp_password || !smtp_from_email) {
      return NextResponse.json(
        { error: "Wszystkie wymagane pola muszą być wypełnione" },
        { status: 400 }
      )
    }

    // Walidacja portu
    const port = parseInt(smtp_port)
    if (isNaN(port) || port < 1 || port > 65535) {
      return NextResponse.json(
        { error: "Port musi być liczbą między 1 a 65535" },
        { status: 400 }
      )
    }

    // Walidacja email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(smtp_user) || !emailRegex.test(smtp_from_email)) {
      return NextResponse.json(
        { error: "Nieprawidłowy format adresu email" },
        { status: 400 }
      )
    }

    // Przygotuj dane do zapisania
    const settingsToSave = [
      { key: 'smtp_host', value: smtp_host.trim() },
      { key: 'smtp_port', value: smtp_port.toString() },
      { key: 'smtp_secure', value: smtp_secure.toString() },
      { key: 'smtp_user', value: smtp_user.trim() },
      { key: 'smtp_password', value: smtp_password },
      { key: 'smtp_from_email', value: smtp_from_email.trim() },
      { key: 'smtp_from_name', value: smtp_from_name?.trim() || 'TeamFlow' }
    ]

    // Zapisz lub zaktualizuj każde ustawienie
    for (const setting of settingsToSave) {
      await prisma.systemSettings.upsert({
        where: { key: setting.key },
        update: { 
          value: setting.value,
          updatedAt: new Date()
        },
        create: {
          key: setting.key,
          value: setting.value,
          description: getSettingDescription(setting.key),
          isEncrypted: setting.key === 'smtp_password' // Oznacz hasło jako zaszyfrowane
        }
      })
    }

    return NextResponse.json({
      message: "Ustawienia SMTP zostały zapisane pomyślnie"
    })
  } catch (error) {
    console.error("Error saving SMTP settings:", error)
    return NextResponse.json(
      { error: "Wystąpił błąd podczas zapisywania ustawień SMTP" },
      { status: 500 }
    )
  }
}

// Funkcja pomocnicza do opisów ustawień
function getSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    smtp_host: "Adres serwera SMTP",
    smtp_port: "Port serwera SMTP",
    smtp_secure: "Czy używać SSL/TLS",
    smtp_user: "Nazwa użytkownika SMTP",
    smtp_password: "Hasło SMTP",
    smtp_from_email: "Adres email nadawcy",
    smtp_from_name: "Nazwa nadawcy"
  }
  return descriptions[key] || ""
}
