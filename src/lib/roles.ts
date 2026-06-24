// System-wide user roles (User.role). Client-safe: pure constants/helpers with
// no server imports, so this can be used from both API routes and components.

export const ROLE_USER = "user"
export const ROLE_ADMIN = "admin"
export const ROLE_MANAGER = "manager"

/** Roles an admin may assign to a user. */
export const ASSIGNABLE_ROLES = [ROLE_USER, ROLE_MANAGER, ROLE_ADMIN] as const

export function isManagerRole(role: string | null | undefined): boolean {
  return role === ROLE_MANAGER
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === ROLE_ADMIN
}
