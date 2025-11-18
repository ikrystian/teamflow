import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { EditTaskContent } from "@/components/tasks/edit-task-content"

interface EditTaskPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const { id } = await params

  return (
    <DashboardLayout>
      <EditTaskContent taskId={id} />
    </DashboardLayout>
  )
}
