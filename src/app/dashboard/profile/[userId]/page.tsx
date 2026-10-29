import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { UserProfileContent } from "@/components/profile/user-profile-content"

interface UserProfilePageProps {
  params: Promise<{
    userId: string
  }>
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { userId } = await params

  return (
    <UserProfileContent userId={userId} />
  )
}
