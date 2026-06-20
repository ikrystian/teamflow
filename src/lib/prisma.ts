import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || "file:./dev.db"
  if (url.startsWith("file:")) {
    const dbPath = url.replace(/^file:/, "")
    if (!path.isAbsolute(dbPath)) {
      const targetPath = dbPath.startsWith("./prisma/") || dbPath.startsWith("prisma/")
        ? dbPath
        : path.join("prisma", dbPath)
      const absoluteDbPath = path.resolve(process.cwd(), targetPath)
      return `file:${absoluteDbPath}`
    }
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

