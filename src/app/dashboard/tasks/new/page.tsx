import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { NewTaskContent } from "@/components/tasks/new-task-content"

export default async function NewTaskPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <NewTaskContent />
    </DashboardLayout>
  )
}
