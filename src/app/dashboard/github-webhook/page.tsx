import { GithubWebhookLogs } from "@/components/dashboard/github-webhook-logs"

export const metadata = {
  title: "GitHub Webhook Logs",
  description: "Browse all incoming GitHub webhook requests",
}

export default function GithubWebhookPage() {
  return <GithubWebhookLogs />
}
