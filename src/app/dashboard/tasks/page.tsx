import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { UserTasksBoardContent } from "@/components/tasks/user-tasks-board-content"

export default async function TasksPage() {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <UserTasksBoardContent />
  )
}

