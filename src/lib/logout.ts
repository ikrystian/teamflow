"use client"

import { signOut } from "next-auth/react"

/**
 * Enhanced logout function that ensures proper cleanup
 * and redirects to the sign-in page
 */
export async function logout() {
  try {
    // Call custom logout API first for server-side cleanup
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch(() => {
      // Continue even if API call fails
    })

    // Clear any local storage or session storage
    if (typeof window !== "undefined") {
      // Clear localStorage
      localStorage.clear()
      
      // Clear sessionStorage
      sessionStorage.clear()
      
      // Clear any cached data or state
      // Add any custom cleanup logic here
    }

    // Sign out with NextAuth
    await signOut({
      callbackUrl: "/auth/signin",
      redirect: true
    })
  } catch (error) {
    console.error("Logout error:", error)
    
    // Fallback - redirect manually if signOut fails
    if (typeof window !== "undefined") {
      window.location.href = "/auth/signin"
    }
  }
}

/**
 * Force logout - more aggressive logout that clears everything
 * Use this if regular logout doesn't work properly
 */
export async function forceLogout() {
  try {
    // Call custom logout API
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch(() => {
      // Continue even if API call fails
    })

    if (typeof window !== "undefined") {
      // Clear all storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear cookies by setting them to expire
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substr(0, eqPos) : c
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      })
    }

    // Try NextAuth signOut first
    await signOut({
      callbackUrl: "/auth/signin",
      redirect: false // Don't auto-redirect, we'll handle it
    })
  } catch (error) {
    console.error("Force logout error:", error)
  } finally {
    // Always redirect to signin page
    if (typeof window !== "undefined") {
      window.location.replace("/auth/signin")
    }
  }
}