import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { ProjectInfoContent } from "@/components/projects/project-info-content"

interface ProjectInfoPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectInfoPage({ params }: ProjectInfoPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const { projectId } = await params

  return (
    <DashboardLayout>
      <ProjectInfoContent projectId={projectId} />
    </DashboardLayout>
  )
}
