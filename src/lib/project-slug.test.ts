import { describe, expect, it } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { generateUniqueProjectSlug, projectPath, slugifyProjectName } from "./project-slug"

function dbWithSlugs(slugs: string[]) {
  return {
    project: {
      findMany: async ({ where }: { where: { slug: { startsWith: string } } }) =>
        slugs.filter((slug) => slug.startsWith(where.slug.startsWith)).map((slug) => ({ slug })),
    },
  } as unknown as PrismaClient
}

describe("slugifyProjectName", () => {
  it("strips Polish diacritics and punctuation", () => {
    expect(slugifyProjectName("Sklep Łódź 2.0")).toBe("sklep-lodz-2-0")
    expect(slugifyProjectName("  Żółć -- gęślą!  ")).toBe("zolc-gesla")
  })

  it("falls back when nothing alphanumeric is left", () => {
    expect(slugifyProjectName("🚀🚀")).toBe("projekt")
  })

  it("caps the length without a trailing hyphen", () => {
    const slug = slugifyProjectName(`${"a".repeat(59)} b`)
    expect(slug).toBe("a".repeat(59))
  })
})

describe("generateUniqueProjectSlug", () => {
  it("uses the plain slug when it is free", async () => {
    expect(await generateUniqueProjectSlug(dbWithSlugs(["sklep-online"]), "Sklep")).toBe("sklep")
  })

  it("suffixes the first free counter on collisions", async () => {
    expect(await generateUniqueProjectSlug(dbWithSlugs(["sklep", "sklep-2"]), "Sklep")).toBe("sklep-3")
  })
})

describe("projectPath", () => {
  it("prefers the slug and falls back to the id", () => {
    expect(projectPath({ id: "abc", slug: "sklep" }, "/settings")).toBe("/dashboard/projects/sklep/settings")
    expect(projectPath({ id: "abc", slug: null })).toBe("/dashboard/projects/abc")
  })
})
