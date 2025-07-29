import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import type { Session } from "next-auth"

/**
 * Check if the current user has admin privileges
 * Admin privileges are granted to:
 * 1. Users with role="admin" in the database
 * 2. Users with email="krystian@bpcoders.pl" (fallback)
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions) as Session | null
    
    if (!session?.user) {
      return false
    }

    // Check if user has admin role
    if (session.user.role === 'admin') {
      return true
    }

    // Fallback: check for specific admin email
    if (session.user.email === 'krystian@bpcoders.pl') {
      return true
    }

    return false
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Get current session with admin check
 * Returns session if user is admin, null otherwise
 */
export async function getAdminSession(): Promise<Session | null> {
  try {
    const session = await getServerSession(authOptions) as Session | null
    
    if (!session?.user) {
      return null
    }

    const adminStatus = await isAdmin()
    if (!adminStatus) {
      return null
    }

    return session
  } catch (error) {
    console.error('Error getting admin session:', error)
    return null
  }
}

/**
 * Check if a specific user email has admin privileges
 */
export function isAdminEmail(email: string): boolean {
  return email === 'krystian@bpcoders.pl'
}
