import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ProjectInfoContent } from "@/components/projects/project-info-content"

interface ProjectInfoPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectInfoPage({ params }: ProjectInfoPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { projectId } = await params

  return (
    <ProjectInfoContent projectId={projectId} />
  )
}
