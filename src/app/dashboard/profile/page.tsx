import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { UserProfileContent } from "@/components/profile/user-profile-content"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  // Get current user's ID from session
  const userId = session.user?.id

  if (!userId) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <UserProfileContent userId={userId} />
    </DashboardLayout>
  )
}
