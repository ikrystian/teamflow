import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ProjectsContent } from "@/components/projects/projects-content"

export default async function ProjectsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <ProjectsContent />
  )
}
