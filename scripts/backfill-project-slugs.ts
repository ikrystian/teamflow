/**
 * Give every project created before slugs existed a slug, so its dashboard URL
 * becomes /dashboard/projects/<slug> instead of the id. Oldest projects are
 * processed first and keep the plain slug when two names collide.
 *
 * Run once per database (idempotent — projects with a slug are skipped). It is
 * chained into `npm run db:push`, after fix-mongo-indexes.js has created the
 * partial unique index on Project.slug.
 */
import { config } from "dotenv"

config({ path: ".env.local", quiet: true })
config({ quiet: true })

async function main() {
  const { prisma } = await import("../src/lib/prisma")
  const { generateUniqueProjectSlug } = await import("../src/lib/project-slug")

  try {
    // A missing field and an explicit null (see fix-mongo-nulls.js) both mean "no slug yet".
    const projects = await prisma.project.findMany({
      where: { OR: [{ slug: null }, { slug: { isSet: false } }] },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    })

    // Sequential on purpose: each new slug must be visible to the next lookup.
    for (const project of projects) {
      const slug = await generateUniqueProjectSlug(prisma, project.name)
      await prisma.project.update({ where: { id: project.id }, data: { slug } })
      console.log(`[backfill-project-slugs] ${project.id} -> ${slug}`)
    }

    console.log(`[backfill-project-slugs] ${projects.length} project(s) updated`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error("[backfill-project-slugs] FAILED:", error)
  process.exitCode = 1
})
