import { existsSync } from "fs"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  MAX_PROJECT_IMAGE_BYTES,
  decodeInlineImage,
  deleteProjectImage,
  isInlineImage,
  saveProjectImage,
} from "./project-image"

const padding = Buffer.alloc(32, 1)
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), padding])
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), padding])
const gif = Buffer.concat([Buffer.from("GIF89a", "latin1"), padding])
const webp = Buffer.concat([Buffer.from("RIFF", "latin1"), Buffer.alloc(4), Buffer.from("WEBP", "latin1"), padding])

const dataUrl = (bytes: Buffer, type = "image/jpeg") => `data:${type};base64,${bytes.toString("base64")}`

describe("isInlineImage", () => {
  it("tells data URLs from links", () => {
    expect(isInlineImage(dataUrl(jpeg))).toBe(true)
    expect(isInlineImage("/uploads/projects/abc.jpg")).toBe(false)
    expect(isInlineImage(null)).toBe(false)
  })
})

describe("decodeInlineImage", () => {
  it("decodes the supported raster formats", () => {
    expect(decodeInlineImage(dataUrl(jpeg))).toEqual({ bytes: jpeg, extension: "jpg" })
    expect(decodeInlineImage(dataUrl(png, "image/png"))?.extension).toBe("png")
    expect(decodeInlineImage(dataUrl(gif, "image/gif"))?.extension).toBe("gif")
    expect(decodeInlineImage(dataUrl(webp, "image/webp"))?.extension).toBe("webp")
  })

  it("trusts the file signature over the declared type", () => {
    expect(decodeInlineImage(dataUrl(png, "image/jpeg"))?.extension).toBe("png")
  })

  it("rejects content that is not a raster image", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    const html = Buffer.from("<!doctype html><script>alert(1)</script>")

    expect(decodeInlineImage(dataUrl(svg, "image/svg+xml"))).toBeNull()
    expect(decodeInlineImage(dataUrl(html, "image/jpeg"))).toBeNull()
    expect(decodeInlineImage(dataUrl(jpeg, "text/html"))).toBeNull()
  })

  it("rejects anything that is not a base64 data URL", () => {
    expect(decodeInlineImage("/uploads/projects/abc.jpg")).toBeNull()
    expect(decodeInlineImage("https://example.com/cover.jpg")).toBeNull()
    expect(decodeInlineImage("data:image/jpeg,plain-text")).toBeNull()
    expect(decodeInlineImage(undefined)).toBeNull()
    expect(decodeInlineImage(42)).toBeNull()
  })

  it("enforces the size limit", () => {
    const atLimit = Buffer.concat([jpeg, Buffer.alloc(MAX_PROJECT_IMAGE_BYTES - jpeg.length)])
    const overLimit = Buffer.concat([atLimit, Buffer.alloc(1)])

    expect(decodeInlineImage(dataUrl(atLimit))?.bytes.length).toBe(MAX_PROJECT_IMAGE_BYTES)
    expect(decodeInlineImage(dataUrl(overLimit))).toBeNull()
  })
})

describe("project image files", () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "nexus-project-image-"))
    vi.spyOn(process, "cwd").mockReturnValue(root)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it("stores the image in uploads/projects and returns its link", async () => {
    const url = await saveProjectImage({ bytes: png, extension: "png" })

    expect(url).toMatch(/^\/uploads\/projects\/[0-9a-f-]{36}\.png$/)
    expect(await readFile(join(root, url))).toEqual(png)
  })

  it("gives every upload its own file", async () => {
    const first = await saveProjectImage({ bytes: jpeg, extension: "jpg" })
    const second = await saveProjectImage({ bytes: jpeg, extension: "jpg" })

    expect(first).not.toBe(second)
    expect(await readdir(join(root, "uploads", "projects"))).toHaveLength(2)
  })

  it("deletes a stored image and tolerates a missing one", async () => {
    const url = await saveProjectImage({ bytes: jpeg, extension: "jpg" })

    await deleteProjectImage(url)
    expect(existsSync(join(root, url))).toBe(false)

    await expect(deleteProjectImage(url)).resolves.toBeUndefined()
    await expect(deleteProjectImage(null)).resolves.toBeUndefined()
  })

  it("only ever deletes files sitting directly in uploads/projects", async () => {
    const document = join(root, "uploads", "projects", "p1", "documents", "offer.pdf")
    const attachment = join(root, "uploads", "tasks", "t1", "scan.png")
    const outside = join(root, "secret.txt")
    await mkdir(join(document, ".."), { recursive: true })
    await mkdir(join(attachment, ".."), { recursive: true })
    await Promise.all([document, attachment, outside].map((file) => writeFile(file, "keep")))

    await deleteProjectImage("/uploads/projects/p1/documents/offer.pdf")
    await deleteProjectImage("/uploads/tasks/t1/scan.png")
    await deleteProjectImage("/uploads/projects/../../secret.txt")
    await deleteProjectImage("/uploads/projects/..")
    await deleteProjectImage(dataUrl(jpeg))
    await deleteProjectImage("https://example.com/uploads/projects/cover.jpg")

    expect(existsSync(document)).toBe(true)
    expect(existsSync(attachment)).toBe(true)
    expect(existsSync(outside)).toBe(true)
  })
})
