import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ProjectSettingsContent } from "@/components/projects/project-settings-content"

interface ProjectSettingsPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { projectId } = await params

  return (
    <ProjectSettingsContent projectId={projectId} />
  )
}
