import { join } from "path"

/**
 * Resolve a public /uploads/... URL (project image, document, task image or
 * attachment) to its file on disk, or null when the URL is not an upload or
 * tries to climb out of the folder with "..".
 *
 * The path is joined onto the literal "uploads" folder (not the raw URL), so
 * Turbopack's file tracing stays scoped to it instead of the whole project.
 */
export function uploadsFilePath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null

  const segments = url.slice("/uploads/".length).split("/")
  if (segments.includes("..")) return null

  return join(process.cwd(), "uploads", ...segments)
}
