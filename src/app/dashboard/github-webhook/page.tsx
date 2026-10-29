import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { GithubWebhookLogs } from "@/components/dashboard/github-webhook-logs"

export const metadata = {
  title: "GitHub Webhook Logs",
  description: "Browse all incoming GitHub webhook requests",
}

export default async function GithubWebhookPage() {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <GithubWebhookLogs />
  )
}
