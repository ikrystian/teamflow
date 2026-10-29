import { unstable_rethrow } from "next/navigation"
import { getSession, type AppSession } from "./auth/session"
import { isSystemAdmin } from "./roles"

/**
 * Check if the current user has admin privileges
 * Admin privileges are granted to:
 * 1. Users with role="admin" (Better Auth user, mirrored to the project profile)
 * 2. Users with email="krystian@bpcoders.pl" (fallback)
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return false
    }

    // Admin role or the fallback admin e-mail (see lib/roles.ts)
    return isSystemAdmin(session.user.role, session.user.email)
  } catch (error) {
    // Let Next.js internals (dynamic rendering bail-out, redirects) propagate
    unstable_rethrow(error)
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Get current session with admin check
 * Returns session if user is admin, null otherwise
 */
export async function getAdminSession(): Promise<AppSession | null> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return null
    }

    const adminStatus = await isAdmin()
    if (!adminStatus) {
      return null
    }

    return session
  } catch (error) {
    unstable_rethrow(error)
    console.error('Error getting admin session:', error)
    return null
  }
}
