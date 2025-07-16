import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TeamFlow</h1>
          <p className="text-lg text-gray-600 mb-8">
            Modern team collaboration and project management platform
          </p>
          <div className="space-y-4">
            <Link href="/auth/signin">
              <Button className="w-full" size="lg">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" className="w-full" size="lg">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
