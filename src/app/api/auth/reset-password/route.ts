import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token i nowe hasło są wymagane" },
        { status: 400 }
      )
    }

    // Walidacja hasła
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Hasło musi mieć co najmniej 8 znaków" },
        { status: 400 }
      )
    }

    // Sprawdź czy token istnieje i jest ważny
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            password: true
          }
        }
      }
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: "Nieprawidłowy token resetowania" },
        { status: 400 }
      )
    }

    // Sprawdź czy token nie został już użyty
    if (resetToken.used) {
      return NextResponse.json(
        { error: "Token został już użyty" },
        { status: 400 }
      )
    }

    // Sprawdź czy token nie wygasł
    if (resetToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Token wygasł. Wygeneruj nowy link resetujący." },
        { status: 400 }
      )
    }

    // Sprawdź czy nowe hasło różni się od obecnego
    const isSamePassword = await bcrypt.compare(newPassword, resetToken.user.password)
    if (isSamePassword) {
      return NextResponse.json(
        { error: "Nowe hasło musi być różne od obecnego" },
        { status: 400 }
      )
    }

    // Zahashuj nowe hasło
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Rozpocznij transakcję
    await prisma.$transaction(async (tx) => {
      // Zaktualizuj hasło użytkownika
      await tx.user.update({
        where: { id: resetToken.user.id },
        data: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      })

      // Oznacz token jako użyty
      await tx.passwordResetToken.update({
        where: { token },
        data: { used: true }
      })

      // Usuń wszystkie inne tokeny resetowania dla tego użytkownika
      await tx.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.user.id,
          id: { not: resetToken.id }
        }
      })

      // Usuń wszystkie sesje użytkownika (wymusi ponowne logowanie)
      await tx.session.deleteMany({
        where: { userId: resetToken.user.id }
      })
    })

    return NextResponse.json({
      message: "Hasło zostało pomyślnie zresetowane"
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      { error: "Wystąpił błąd podczas resetowania hasła" },
      { status: 500 }
    )
  }
}
