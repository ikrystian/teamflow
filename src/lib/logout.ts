"use client"

import { authClient } from "@/lib/auth/client"
import { lockVault } from "@/lib/vault/store"

/**
 * Wylogowanie z całego Nexusa: zerowanie kluczy sejfu w pamięci karty,
 * unieważnienie sesji Better Auth i powrót do logowania.
 */
export async function logout() {
  try {
    lockVault("logout")
    await authClient.signOut()
  } catch (error) {
    console.error("Logout error:", error)
  } finally {
    if (typeof window !== "undefined") {
      window.location.replace("/auth/signin")
    }
  }
}
