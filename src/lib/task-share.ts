import { randomBytes } from "crypto"
import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"

/**
 * Build the absolute, publicly accessible read-only URL for a task share token.
 */
export function buildTaskShareUrl(shareToken: string): string {
  return new URL(`/public/task/${shareToken}`, env.APP_URL).toString()
}

/**
 * Return the task's public share token, generating and persisting one the first
 * time it is needed. Tasks are shared lazily so existing rows don't need a token
 * until someone actually shares them.
 */
export async function getOrCreateTaskShareToken(taskId: string): Promise<string> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { shareToken: true },
  })

  if (task?.shareToken) {
    return task.shareToken
  }

  const shareToken = randomBytes(24).toString("hex")
  await prisma.task.update({
    where: { id: taskId },
    data: { shareToken },
  })

  return shareToken
}
