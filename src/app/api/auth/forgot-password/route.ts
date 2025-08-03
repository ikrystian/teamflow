import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Adres email jest wymagany" },
        { status: 400 }
      )
    }

    // Walidacja formatu email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Nieprawidłowy format adresu email" },
        { status: 400 }
      )
    }

    // Sprawdź czy użytkownik istnieje
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    // Ze względów bezpieczeństwa zawsze zwracamy sukces, 
    // nawet jeśli użytkownik nie istnieje
    if (!user) {
      return NextResponse.json({
        message: "Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła"
      })
    }

    // Usuń wszystkie poprzednie tokeny resetowania dla tego użytkownika
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })

    // Wygeneruj nowy token resetowania
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 godzina

    // Zapisz token w bazie danych
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expires: expiresAt,
        used: false
      }
    })

    // Wyślij email z linkiem resetującym
    try {
      await sendPasswordResetEmail(user.email, user.name || user.email, resetToken)
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError)
      
      // Usuń token jeśli nie udało się wysłać maila
      await prisma.passwordResetToken.delete({
        where: { token: resetToken }
      })

      return NextResponse.json(
        { error: "Nie udało się wysłać maila. Sprawdź konfigurację SMTP." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła"
    })
  } catch (error) {
    console.error("Error in forgot password:", error)
    return NextResponse.json(
      { error: "Wystąpił błąd podczas przetwarzania żądania" },
      { status: 500 }
    )
  }
}
