import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { GithubWebhookLogs } from "@/components/dashboard/github-webhook-logs"

export const metadata = {
  title: "GitHub Webhook Logs",
  description: "Browse all incoming GitHub webhook requests",
}

export default async function GithubWebhookPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <GithubWebhookLogs />
    </DashboardLayout>
  )
}
