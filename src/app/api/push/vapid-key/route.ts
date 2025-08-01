import { NextResponse } from "next/server"

// VAPID keys - w produkcji powinny być w zmiennych środowiskowych
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa40HI8YJdu-_Qdf9WPVrSuFkuMpEqiEhZ6IIBXRxQVHSCUyxQ7T7QKBtdPUYE"

export async function GET() {
  try {
    return NextResponse.json({
      publicKey: VAPID_PUBLIC_KEY
    })
  } catch (error) {
    console.error("Error getting VAPID key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
