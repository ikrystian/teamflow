import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { ProjectSettingsContent } from "@/components/projects/project-settings-content"

interface ProjectSettingsPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const { projectId } = await params

  return (
    <DashboardLayout>
      <ProjectSettingsContent projectId={projectId} />
    </DashboardLayout>
  )
}
