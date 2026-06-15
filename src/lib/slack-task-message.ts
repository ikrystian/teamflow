import { prisma } from "@/lib/prisma"
import { join } from "path"
import { readFile } from "fs/promises"

const SLACK_API = "https://slack.com/api"

export interface SlackSendResult {
  ok: boolean
  error?: string
  // Identify the posted message so it can later be deleted via chat.delete.
  ts?: string
  channel?: string
}

export interface SlackDeleteResult {
  ok: boolean
  error?: string
}

// Pull the message timestamp/channel out of a files.completeUploadExternal
// response. When files are posted with an initial_comment they appear as a
// single channel message whose ts lives under each file's `shares` map.
function extractShareRef(
  data: { files?: unknown }
): { ts?: string; channel?: string } {
  const files = Array.isArray(data.files) ? data.files : []
  for (const file of files) {
    const shares = (file as { shares?: Record<string, unknown> })?.shares
    if (!shares) continue
    // Shares are grouped by visibility ("public"/"private"), then channel id.
    for (const group of Object.values(shares)) {
      if (!group || typeof group !== "object") continue
      for (const [channel, entries] of Object.entries(group)) {
        const first = Array.isArray(entries) ? entries[0] : undefined
        const ts = (first as { ts?: string })?.ts
        if (ts) return { ts, channel }
      }
    }
  }
  return {}
}

function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith("image/")
}

// Upload a single file to Slack using the modern external upload flow
// (files.getUploadURLExternal -> upload bytes -> files.completeUploadExternal).
// Returns the file reference needed to complete the upload. Throws on failure.
async function uploadImageToSlack(
  token: string,
  buffer: Buffer,
  filename: string
): Promise<{ id: string; title: string }> {
  // Step 1: reserve an upload URL for the file.
  const query = new URLSearchParams({
    filename,
    length: String(buffer.length),
  })
  const urlRes = await fetch(
    `${SLACK_API}/files.getUploadURLExternal?${query.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const urlData = await urlRes.json()
  if (!urlData.ok) {
    throw new Error(`getUploadURLExternal: ${urlData.error}`)
  }

  // Step 2: send the raw bytes to the reserved URL.
  const form = new FormData()
  form.append("file", new Blob([new Uint8Array(buffer)]), filename)
  const uploadRes = await fetch(urlData.upload_url as string, {
    method: "POST",
    body: form,
  })
  if (!uploadRes.ok) {
    throw new Error(`file upload failed with status ${uploadRes.status}`)
  }

  return { id: urlData.file_id as string, title: filename }
}

// Send a task's change note to a Slack channel. When the task has image
// attachments, they are uploaded and posted together with the note as a single
// message (the note becomes the message's initial comment). Without images this
// falls back to a plain chat.postMessage, preserving the original behaviour.
export async function sendTaskMessageToSlack({
  taskId,
  channelId,
  token,
  text,
}: {
  taskId: string
  channelId: string
  token: string
  text: string
}): Promise<SlackSendResult> {
  // Gather and upload image attachments (oldest first, matching the task view).
  let imageFiles: { id: string; title: string }[] = []
  try {
    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    })

    for (const attachment of attachments) {
      if (!isImageAttachment(attachment.mimeType)) continue

      const filepath = join(
        process.cwd(),
        "uploads",
        "tasks",
        taskId,
        "attachments",
        attachment.filename
      )

      let buffer: Buffer
      try {
        buffer = await readFile(filepath)
      } catch {
        // Recorded in the DB but missing on disk — skip rather than fail.
        console.warn(`[Slack] Attachment file missing on disk: ${filepath}`)
        continue
      }

      imageFiles.push(
        await uploadImageToSlack(token, buffer, attachment.originalName)
      )
    }
  } catch (error) {
    // If preparing attachments fails, fall back to a text-only message so the
    // notification still goes out.
    console.error("[Slack] Failed to prepare image attachments:", error)
    imageFiles = []
  }

  // With images: post one message carrying the note and the files together.
  if (imageFiles.length > 0) {
    const res = await fetch(`${SLACK_API}/files.completeUploadExternal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        files: imageFiles,
        channel_id: channelId,
        initial_comment: text,
      }),
    })
    const data = await res.json()
    if (!data.ok) {
      return { ok: false, error: data.error }
    }
    const ref = extractShareRef(data)
    return { ok: true, ts: ref.ts, channel: ref.channel ?? channelId }
  }

  // No images: keep the original plain-text behaviour.
  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: channelId,
      text,
      mrkdwn: true,
    }),
  })
  const data = await res.json()
  if (!data.ok) {
    return { ok: false, error: data.error }
  }
  return { ok: true, ts: data.ts, channel: data.channel ?? channelId }
}

// Delete a previously posted message from a Slack channel via chat.delete.
// Requires the channel id and message ts recorded when the message was sent.
export async function deleteTaskMessageFromSlack({
  token,
  channelId,
  ts,
}: {
  token: string
  channelId: string
  ts: string
}): Promise<SlackDeleteResult> {
  const res = await fetch(`${SLACK_API}/chat.delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: channelId, ts }),
  })
  const data = await res.json()
  if (!data.ok) {
    return { ok: false, error: data.error }
  }
  return { ok: true }
}
