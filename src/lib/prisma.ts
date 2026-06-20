import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || "file:./dev.db"
  if (url.startsWith("file:./") && !url.startsWith("file:./prisma/")) {
    return url.replace("file:./", "file:./prisma/")
  }
  return url
}

/**
 * Build a Prisma client with logging enabled so that DB-level issues
 * (e.g. SQLite "attempt to write a readonly database") are surfaced
 * instead of being silently swallowed by the default client.
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: getDatabaseUrl(),
  })

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["error", "warn"],
  })
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

