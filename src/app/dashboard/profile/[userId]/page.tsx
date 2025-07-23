import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { UserProfileContent } from "@/components/profile/user-profile-content"

interface UserProfilePageProps {
  params: Promise<{
    userId: string
  }>
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const { userId } = await params

  return (
    <DashboardLayout>
      <UserProfileContent userId={userId} />
    </DashboardLayout>
  )
}
