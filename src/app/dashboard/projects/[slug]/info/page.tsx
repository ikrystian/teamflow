import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { resolveProjectRoute } from "@/lib/project-route"
import { ProjectInfoContent } from "@/components/projects/project-info-content"

interface ProjectInfoPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ProjectInfoPage({ params }: ProjectInfoPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { slug } = await params
  const project = await resolveProjectRoute(slug, "/info")

  return (
    <ProjectInfoContent projectId={project.id} />
  )
}
