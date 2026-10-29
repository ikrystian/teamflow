import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ProjectDetailsContent } from "@/components/projects/project-details-content"

interface ProjectPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { projectId } = await params

  return (
    <ProjectDetailsContent projectId={projectId} />
  )
}
