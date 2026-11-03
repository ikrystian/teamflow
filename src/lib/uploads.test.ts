import { join } from "path"
import { describe, expect, it } from "vitest"
import { uploadsFilePath } from "./uploads"

describe("uploadsFilePath", () => {
  it("maps an upload URL into the uploads folder", () => {
    expect(uploadsFilePath("/uploads/projects/abc_1.png")).toBe(join(process.cwd(), "uploads", "projects", "abc_1.png"))
  })

  it("rejects URLs outside /uploads/", () => {
    expect(uploadsFilePath("/images/cover.png")).toBeNull()
    expect(uploadsFilePath("https://example.com/uploads/x.png")).toBeNull()
  })

  it("rejects directory traversal", () => {
    expect(uploadsFilePath("/uploads/projects/../../.env")).toBeNull()
  })
})
