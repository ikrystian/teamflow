/**
 * Move project images that are still stored inline in MongoDB (base64 data
 * URLs, as the project form saved them before images became files) to
 * uploads/projects/, leaving only the link in Project.imageUrl. That is what
 * shrinks /api/projects from megabytes to kilobytes for existing projects.
 *
 * Run it from the project root: files go to ./uploads/projects, the folder
 * the app serves /uploads/ from. Idempotent — projects whose imageUrl is
 * already a link are skipped — so it is chained into `npm run db:push`.
 *
 *   npm run migrate:project-images -- --dry-run   # only list what would move
 *   npm run migrate:project-images
 */
import { config } from "dotenv"

config({ path: ".env.local", quiet: true })
config({ quiet: true })

const dryRun = process.argv.includes("--dry-run")
const log = (message: string) => console.log(`[migrate-project-images] ${message}`)

async function main() {
  const { prisma } = await import("../src/lib/prisma")
  const { decodeInlineImage, deleteProjectImage, saveProjectImage } = await import("../src/lib/project-image")

  try {
    const projects = await prisma.project.findMany({
      where: { imageUrl: { startsWith: "data:" } },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    })

    let moved = 0
    for (const { id, name } of projects) {
      const label = `${id} (${name})`

      // One image at a time: each is up to a few megabytes of base64.
      const project = await prisma.project.findUnique({ where: { id }, select: { imageUrl: true, updatedAt: true } })
      const image = decodeInlineImage(project?.imageUrl)
      if (!project || !image) {
        log(`${label}: SKIPPED — imageUrl is not a JPEG, PNG, WebP or GIF data URL`)
        continue
      }

      const size = `${Math.round(image.bytes.length / 1024)} kB`
      if (dryRun) {
        log(`${label}: would move ${size} to a file`)
        continue
      }

      const imageUrl = await saveProjectImage(image)

      // Swap only the exact value that was converted (the project may have been
      // edited meanwhile) and keep updatedAt — this is a storage change, not an edit.
      const { count } = await prisma.project.updateMany({
        where: { id, imageUrl: project.imageUrl },
        data: { imageUrl, updatedAt: project.updatedAt },
      })
      if (count === 0) {
        await deleteProjectImage(imageUrl)
        log(`${label}: SKIPPED — image changed in the meantime`)
        continue
      }

      moved++
      log(`${label} -> ${imageUrl} (${size})`)
    }

    log(dryRun
      ? `${projects.length} project image(s) stored inline; nothing was changed (--dry-run)`
      : `${moved} of ${projects.length} inline project image(s) moved to files`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error("[migrate-project-images] FAILED:", error)
  process.exitCode = 1
})
