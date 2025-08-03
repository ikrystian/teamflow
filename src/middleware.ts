import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Handle logout redirect
    if (req.nextUrl.pathname === "/api/auth/signout") {
      const url = req.nextUrl.clone()
      url.pathname = "/auth/signin"
      return NextResponse.redirect(url)
    }

    // Allow access to authenticated routes
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Always allow access to auth pages
        if (req.nextUrl.pathname.startsWith("/auth/")) {
          return true
        }

        // Allow access to API routes that don't require auth
        if (req.nextUrl.pathname.startsWith("/api/auth/")) {
          return true
        }

        // For dashboard routes, require authentication
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token
        }

        // Allow public routes
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}