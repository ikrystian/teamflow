import "server-only"
import type { ChangelogEntry } from "@prisma/client"
import type { z } from "zod"
import { changelogCutoff, MAX_UNSEEN_ENTRIES, type ChangelogEntryDto } from "@/lib/changelog-shared"
import { prisma } from "@/lib/prisma"
import type { changelogCreateSchema, changelogUpdateSchema } from "@/lib/validation"

/**
 * Changelog („Co nowego”): wpisy dodaje administrator w ustawieniach, a każdy użytkownik
 * widzi opublikowane wpisy raz — w popupie na dashboardzie. Stan „widziane” to data
 * publikacji najnowszego pokazanego wpisu w `User.changelogSeenAt` (MongoDB).
 */

export function toChangelogDto(entry: ChangelogEntry): ChangelogEntryDto {
  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    publishedAt: entry.publishedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}

/** Opublikowane wpisy, których użytkownik jeszcze nie widział (najnowsze pierwsze). */
export async function getUnseenChangelog(userId: string): Promise<ChangelogEntryDto[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, changelogSeenAt: true } })
  if (!user) return []
  const entries = await prisma.changelogEntry.findMany({
    where: { publishedAt: { gt: changelogCutoff(user.changelogSeenAt, user.createdAt) } },
    orderBy: { publishedAt: "desc" },
    take: MAX_UNSEEN_ENTRIES,
  })
  return entries.map(toChangelogDto)
}

/**
 * Oznacza jako widziane wszystko do wskazanego (najnowszego pokazanego) wpisu włącznie.
 * Znacznik tylko rośnie, a wpis opublikowany po wyświetleniu popupu nadal pokaże się później.
 */
export async function markChangelogSeen(userId: string, entryId: string): Promise<boolean> {
  const [entry, user] = await Promise.all([
    prisma.changelogEntry.findUnique({ where: { id: entryId }, select: { publishedAt: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { changelogSeenAt: true } }),
  ])
  if (!entry?.publishedAt || !user) return false
  if (user.changelogSeenAt && user.changelogSeenAt.getTime() >= entry.publishedAt.getTime()) return true
  await prisma.user.update({ where: { id: userId }, data: { changelogSeenAt: entry.publishedAt } })
  return true
}

// --- Administracja ---------------------------------------------------------------------------

export async function listChangelogEntries(): Promise<ChangelogEntryDto[]> {
  const entries = await prisma.changelogEntry.findMany({ orderBy: { createdAt: "desc" } })
  // Szkice na górze, potem opublikowane od najnowszych.
  entries.sort((a, b) => (b.publishedAt?.getTime() ?? Infinity) - (a.publishedAt?.getTime() ?? Infinity))
  return entries.map(toChangelogDto)
}

export async function createChangelogEntry(
  authorId: string,
  input: z.infer<typeof changelogCreateSchema>,
): Promise<ChangelogEntryDto> {
  const entry = await prisma.changelogEntry.create({
    data: {
      title: input.title,
      content: input.content,
      // Jawny null — filtry Mongo nie dopasowują braku pola.
      publishedAt: input.publish ? new Date() : null,
      createdById: authorId,
    },
  })
  return toChangelogDto(entry)
}

/** Zwraca null, gdy wpis nie istnieje. Ponowna publikacja ustawia nową datę (wpis znów jest „nowy”). */
export async function updateChangelogEntry(
  id: string,
  input: z.infer<typeof changelogUpdateSchema>,
): Promise<ChangelogEntryDto | null> {
  const current = await prisma.changelogEntry.findUnique({ where: { id }, select: { publishedAt: true } })
  if (!current) return null
  const publishedAt =
    input.published === undefined ? undefined : input.published ? (current.publishedAt ?? new Date()) : null
  const entry = await prisma.changelogEntry.update({
    where: { id },
    data: { title: input.title, content: input.content, publishedAt },
  })
  return toChangelogDto(entry)
}

export async function deleteChangelogEntry(id: string): Promise<boolean> {
  const { count } = await prisma.changelogEntry.deleteMany({ where: { id } })
  return count > 0
}
