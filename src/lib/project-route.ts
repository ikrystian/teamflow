import "server-only"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { projectPath, type ProjectSubpath } from "@/lib/project-slug"

/**
 * Resolve the [slug] segment of /dashboard/projects/[slug]/... to a project.
 * Older links (bookmarks, push notifications) still carry the project id —
 * those redirect to the slug URL once the project has a slug.
 */
export async function resolveProjectRoute(
  slugOrId: string,
  subpath: ProjectSubpath = ""
): Promise<{ id: string; slug: string | null }> {
  const select = { id: true, slug: true } as const

  const bySlug = await prisma.project.findFirst({ where: { slug: slugOrId }, select })
  if (bySlug) return bySlug

  const byId = await prisma.project.findUnique({ where: { id: slugOrId }, select })
  if (!byId) notFound()
  if (byId.slug) redirect(projectPath(byId, subpath))

  return byId
}
