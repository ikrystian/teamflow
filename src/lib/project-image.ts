import { randomUUID } from "crypto"
import { mkdir, unlink, writeFile } from "fs/promises"
import { join } from "path"

/**
 * Project cover images are files in uploads/projects/ and the database keeps
 * only their public link (Project.imageUrl), so API responses stay small.
 * The project form still hands over a freshly cropped image inline, as a
 * base64 data URL — these helpers turn it into a file.
 */

const URL_PREFIX = "/uploads/projects/"

/** Same limit as the file picker in the project form. */
export const MAX_PROJECT_IMAGE_BYTES = 10 * 1024 * 1024

/** Shown in the project form when the submitted image is rejected. */
export const INVALID_PROJECT_IMAGE_MESSAGE =
  "Nieprawidłowy obraz projektu — dozwolone formaty to JPG, PNG, WebP i GIF, maksymalnie 10 MB"

export interface ProjectImage {
  bytes: Buffer
  extension: "jpg" | "png" | "webp" | "gif"
}

const DATA_URL_HEADER = /^data:image\/[a-z0-9.+-]+;base64,/i
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * The format is read from the file signature, never from the declared MIME
 * type: the extension decides the Content-Type the /uploads route answers
 * with, so it has to match what the file really is. Raster formats only —
 * an SVG could carry scripts.
 */
function detectExtension(bytes: Buffer): ProjectImage["extension"] | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg"
  if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return "png"

  const head = bytes.toString("latin1", 0, 12)
  if (head.startsWith("GIF87a") || head.startsWith("GIF89a")) return "gif"
  if (head.startsWith("RIFF") && head.endsWith("WEBP")) return "webp"
  return null
}

/** True for an image passed inline (data URL) rather than as a link. */
export function isInlineImage(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:")
}

/**
 * Decode a base64 image data URL. Returns null for anything that is not a
 * JPEG, PNG, WebP or GIF of at most MAX_PROJECT_IMAGE_BYTES.
 */
export function decodeInlineImage(value: unknown): ProjectImage | null {
  if (typeof value !== "string") return null

  const header = DATA_URL_HEADER.exec(value)
  if (!header) return null

  // Turn away oversized payloads before decoding them into memory.
  const base64Length = value.length - header[0].length
  if (base64Length > Math.ceil(MAX_PROJECT_IMAGE_BYTES / 3) * 4) return null

  const bytes = Buffer.from(value.slice(header[0].length), "base64")
  const extension = detectExtension(bytes)
  if (!extension || bytes.length > MAX_PROJECT_IMAGE_BYTES) return null

  return { bytes, extension }
}

/** Write the image to uploads/projects/ and return its public link. */
export async function saveProjectImage(image: ProjectImage): Promise<string> {
  const directory = join(process.cwd(), "uploads", "projects")
  await mkdir(directory, { recursive: true })

  // A fresh name for every upload — the /uploads route serves files as immutable.
  const filename = `${randomUUID()}.${image.extension}`
  await writeFile(join(directory, filename), image.bytes, { flag: "wx" })

  return `${URL_PREFIX}${filename}`
}

/**
 * Delete a stored project image. Only a file sitting directly in
 * uploads/projects/ qualifies: inline images of old records, external URLs
 * and paths leading anywhere else (say, into a project's documents folder)
 * are left alone.
 */
export async function deleteProjectImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl?.startsWith(URL_PREFIX)) return

  const filename = imageUrl.slice(URL_PREFIX.length)
  if (!/^[\w-][\w.-]*$/.test(filename)) return

  try {
    await unlink(join(process.cwd(), "uploads", "projects", filename))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Failed to delete project image file:", error)
    }
  }
}
