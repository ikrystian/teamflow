import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { NewTaskPageContent } from "@/components/tasks/new-task-page-content"

export default async function NewTaskPage() {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <NewTaskPageContent />
  )
}
