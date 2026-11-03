import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { resolveProjectRoute } from "@/lib/project-route"
import { ProjectDetailsContent } from "@/components/projects/project-details-content"

interface ProjectPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { slug } = await params
  const project = await resolveProjectRoute(slug)

  return (
    <ProjectDetailsContent projectId={project.id} />
  )
}
