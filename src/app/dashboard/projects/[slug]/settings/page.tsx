import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { resolveProjectRoute } from "@/lib/project-route"
import { ProjectSettingsContent } from "@/components/projects/project-settings-content"

interface ProjectSettingsPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { slug } = await params
  const project = await resolveProjectRoute(slug, "/settings")

  return (
    <ProjectSettingsContent projectId={project.id} />
  )
}
