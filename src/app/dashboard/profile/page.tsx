import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { UserProfileContent } from "@/components/profile/user-profile-content"

export default async function ProfilePage() {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  // Get current user's ID from session
  const userId = session.user?.id

  if (!userId) {
    redirect("/auth/signin")
  }

  return (
    <UserProfileContent userId={userId} />
  )
}
