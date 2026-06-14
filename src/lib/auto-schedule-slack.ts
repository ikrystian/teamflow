import { toast } from "sonner"

interface AutoScheduleSlackResponse {
  scheduled?: boolean
  changesScheduledSendAt?: string
  error?: string
}

export async function autoScheduleSlackForDoneTask(
  taskId: string
): Promise<void> {
  try {
    const response = await fetch(`/api/tasks/${taskId}/slack/auto-schedule`, {
      method: "POST",
    })

    if (!response.ok) {
      console.error(
        `Auto-schedule Slack: HTTP ${response.status} for task ${taskId}`
      )
      return
    }

    const data = (await response.json()) as AutoScheduleSlackResponse

    if (data.scheduled && data.changesScheduledSendAt) {
      toast.success(
        `Wysyłka na Slack zaplanowana na ${new Date(
          data.changesScheduledSendAt
        ).toLocaleString("pl-PL")}`
      )
    }
  } catch (error) {
    console.error("Error auto-scheduling Slack send:", error)
  }
}
