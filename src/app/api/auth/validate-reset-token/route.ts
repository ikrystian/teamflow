import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token jest wymagany" },
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
            name: true
          }
        }
      }
    })

    if (!resetToken) {
      return NextResponse.json({
        valid: false,
        error: "Token nie istnieje"
      })
    }

    // Sprawdź czy token nie został już użyty
    if (resetToken.used) {
      return NextResponse.json({
        valid: false,
        error: "Token został już użyty"
      })
    }

    // Sprawdź czy token nie wygasł
    if (resetToken.expires < new Date()) {
      return NextResponse.json({
        valid: false,
        error: "Token wygasł"
      })
    }

    return NextResponse.json({
      valid: true,
      user: {
        email: resetToken.user.email,
        name: resetToken.user.name
      }
    })
  } catch (error) {
    console.error("Error validating reset token:", error)
    return NextResponse.json(
      { valid: false, error: "Wystąpił błąd podczas walidacji tokenu" },
      { status: 500 }
    )
  }
}
