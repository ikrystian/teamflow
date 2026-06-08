import type { Prisma, PrismaClient } from "@prisma/client"

// A "transaction client" works too, so accept either.
type Db = PrismaClient | Prisma.TransactionClient

const FALLBACK_PREFIX = "TSK"

/**
 * Build the alphabetic prefix for a task key from a project name.
 *
 * - Multiple words -> initials of each word ("Project Sample" -> "PS")
 * - Single word    -> first two letters ("Trello" -> "TR")
 * - No / empty name -> FALLBACK_PREFIX ("TSK") for tasks without a project
 */
export function generateProjectPrefix(name?: string | null): string {
  if (!name) return FALLBACK_PREFIX

  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (ó -> o); ł handled below
    .replace(/ł/gi, "l")
    .split(/[\s_-]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)

  if (words.length === 0) return FALLBACK_PREFIX

  let prefix: string
  if (words.length === 1) {
    prefix = words[0].slice(0, 2)
  } else {
    prefix = words.map((w) => w[0]).join("")
  }

  prefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, "")
  return prefix || FALLBACK_PREFIX
}

/**
 * Generate a unique, human-friendly task key like "PS-12".
 *
 * The number is sequential per prefix (max existing number for that prefix + 1),
 * which keeps every key unique across the whole system even when two projects
 * happen to share the same initials.
 */
export async function generateTaskKey(
  db: Db,
  projectId?: string | null
): Promise<string> {
  let prefix = FALLBACK_PREFIX

  if (projectId) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    })
    prefix = generateProjectPrefix(project?.name)
  }

  // Find the highest number already used for this prefix.
  const existing = await db.task.findMany({
    where: { key: { startsWith: `${prefix}-` } },
    select: { key: true },
  })

  let maxNumber = 0
  for (const { key } of existing) {
    if (!key) continue
    const match = key.match(new RegExp(`^${prefix}-(\\d+)$`))
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNumber) maxNumber = n
    }
  }

  return `${prefix}-${maxNumber + 1}`
}

/**
 * Create a task while guaranteeing a unique key, retrying on the (rare) race
 * where two tasks pick the same number concurrently.
 */
export async function createTaskWithKey<T>(
  prisma: PrismaClient,
  projectId: string | null | undefined,
  create: (key: string) => Promise<T>
): Promise<T> {
  const maxAttempts = 5
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = await generateTaskKey(prisma, projectId)
    try {
      return await create(key)
    } catch (error) {
      // P2002 = unique constraint violation on `key`; regenerate and retry.
      const code = (error as { code?: string })?.code
      if (code === "P2002" && attempt < maxAttempts - 1) continue
      throw error
    }
  }
  throw new Error("Failed to generate a unique task key")
}
