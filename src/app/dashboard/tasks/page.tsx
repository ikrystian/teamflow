import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { UserTasksBoardContent } from "@/components/tasks/user-tasks-board-content"

export default async function TasksPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <UserTasksBoardContent />
    </DashboardLayout>
  )
}

