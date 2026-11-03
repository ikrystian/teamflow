import type { Prisma, PrismaClient } from "@prisma/client"

// A "transaction client" works too, so accept either.
type Db = PrismaClient | Prisma.TransactionClient

const FALLBACK_SLUG = "projekt"
const MAX_SLUG_LENGTH = 60

/**
 * Build a URL-safe slug from a project name ("Sklep Łódź 2.0" -> "sklep-lodz-2-0").
 * Falls back to FALLBACK_SLUG when nothing alphanumeric is left (e.g. emoji only).
 */
export function slugifyProjectName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (ó -> o); ł handled below
    .replace(/ł/gi, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, "")

  return slug || FALLBACK_SLUG
}

/**
 * Generate a slug for a new project that no other project uses yet, suffixing
 * a counter on collisions ("sklep", "sklep-2", "sklep-3", ...).
 */
export async function generateUniqueProjectSlug(db: Db, name: string): Promise<string> {
  const base = slugifyProjectName(name)

  const existing = await db.project.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  })
  const taken = new Set(existing.map((p) => p.slug))

  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export type ProjectSubpath = "" | "/info" | "/settings"

/**
 * Dashboard URL of a project. Projects created before slugs existed (and not
 * backfilled yet) fall back to their id, which the route still accepts.
 */
export function projectPath(
  project: { id: string; slug?: string | null },
  subpath: ProjectSubpath = ""
): string {
  return `/dashboard/projects/${project.slug || project.id}${subpath}`
}
