import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { ProjectDetailsContent } from "@/components/projects/project-details-content"

interface ProjectPageProps {
  params: {
    projectId: string
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <ProjectDetailsContent projectId={params.projectId} />
    </DashboardLayout>
  )
}
