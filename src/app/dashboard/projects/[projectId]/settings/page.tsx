import { ProjectSettingsContent } from "@/components/projects/project-settings-content"

interface ProjectSettingsPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { projectId } = await params
  
  return <ProjectSettingsContent projectId={projectId} />
}
