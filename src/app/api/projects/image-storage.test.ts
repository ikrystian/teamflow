import { existsSync } from "fs"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest"

// The project routes with the database, session and CRM lookups stubbed out;
// image files are written for real, into a temporary working directory.
const db = vi.hoisted(() => ({
  project: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
}))

vi.mock("@/lib/prisma", () => ({ prisma: db }))
vi.mock("@/lib/auth/session", () => ({ getSession: async () => ({ user: { id: "user-1" } }) }))
vi.mock("@/lib/admin", () => ({ isAdmin: async () => false }))
vi.mock("@/lib/project-slug", () => ({ generateUniqueProjectSlug: async () => "nowy-projekt" }))
vi.mock("@/lib/crm/directory", () => ({
  isAssignableClient: async () => true,
  withClientRef: async (project: unknown) => project,
  withClientRefs: async (projects: unknown) => projects,
}))

import { POST } from "./route"
import { PATCH } from "./[projectId]/route"

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)])
const otherJpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1]), Buffer.alloc(48, 2)])
const dataUrl = (bytes: Buffer, type = "image/jpeg") => `data:${type};base64,${bytes.toString("base64")}`

const STORED_LINK = /^\/uploads\/projects\/[0-9a-f-]{36}\.jpg$/
const OLD_LINK = "/uploads/projects/p1_1700000000000.jpg"

let root: string
let cwd: MockInstance

const imagesDir = () => join(root, "uploads", "projects")
const storedImages = async () => (existsSync(imagesDir()) ? (await readdir(imagesDir())).sort() : [])

function jsonRequest(method: string, body: unknown) {
  return new NextRequest("http://localhost/api/projects", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "nexus-project-routes-"))
  cwd = vi.spyOn(process, "cwd").mockReturnValue(root)
  db.project.create.mockReset()
  db.project.findFirst.mockReset()
  db.project.update.mockReset()
})

afterEach(async () => {
  cwd.mockRestore()
  await rm(root, { recursive: true, force: true })
})

describe("POST /api/projects", () => {
  const create = (body: unknown) => POST(jsonRequest("POST", body))

  beforeEach(() => {
    db.project.create.mockImplementation(async ({ data }) => ({ id: "p1", ...data }))
  })

  it("stores the submitted image as a file and saves only its link", async () => {
    const response = await create({ name: "Nowy projekt", imageUrl: dataUrl(jpeg) })
    const body = await response.text()
    const { project } = JSON.parse(body)

    expect(response.status).toBe(201)
    expect(project.imageUrl).toMatch(STORED_LINK)
    expect(body).not.toContain("base64")
    expect(db.project.create.mock.calls[0][0].data.imageUrl).toBe(project.imageUrl)
    expect(await readFile(join(root, project.imageUrl))).toEqual(jpeg)
  })

  it("creates a project without an image", async () => {
    const response = await create({ name: "Nowy projekt", imageUrl: null })

    expect(response.status).toBe(201)
    expect(db.project.create.mock.calls[0][0].data.imageUrl).toBeNull()
    expect(await storedImages()).toEqual([])
  })

  it("rejects anything that is not an inline image", async () => {
    const svg = dataUrl(Buffer.from("<svg><script>alert(1)</script></svg>"), "image/svg+xml")

    for (const imageUrl of [svg, OLD_LINK, "https://example.com/cover.jpg", 42]) {
      const response = await create({ name: "Nowy projekt", imageUrl })
      expect(response.status).toBe(400)
    }

    expect(db.project.create).not.toHaveBeenCalled()
    expect(await storedImages()).toEqual([])
  })

  it("removes the file when the project cannot be created", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    db.project.create.mockRejectedValue(new Error("database is down"))

    const response = await create({ name: "Nowy projekt", imageUrl: dataUrl(jpeg) })

    expect(response.status).toBe(500)
    expect(await storedImages()).toEqual([])
  })
})

describe("PATCH /api/projects/[projectId]", () => {
  const patch = (body: unknown) =>
    PATCH(jsonRequest("PATCH", body), { params: Promise.resolve({ projectId: "p1" }) })
  const updateData = () => db.project.update.mock.calls[0][0].data

  beforeEach(async () => {
    await mkdir(imagesDir(), { recursive: true })
    await writeFile(join(root, OLD_LINK), jpeg)

    const existing = { id: "p1", name: "Projekt", clientId: null, imageUrl: OLD_LINK }
    db.project.findFirst.mockResolvedValue(existing)
    db.project.update.mockImplementation(async ({ data }) => ({ ...existing, ...data }))
  })

  it("replaces the image: new file, new link, old file gone", async () => {
    const response = await patch({ name: "Projekt", imageUrl: dataUrl(otherJpeg) })
    const body = await response.text()
    const { project } = JSON.parse(body)

    expect(response.status).toBe(200)
    expect(project.imageUrl).toMatch(STORED_LINK)
    expect(body).not.toContain("base64")
    expect(updateData().imageUrl).toBe(project.imageUrl)
    expect(await readFile(join(root, project.imageUrl))).toEqual(otherJpeg)
    expect(existsSync(join(root, OLD_LINK))).toBe(false)
    expect(await storedImages()).toHaveLength(1)
  })

  it("removes the image when imageUrl is null", async () => {
    const response = await patch({ name: "Projekt", imageUrl: null })

    expect(response.status).toBe(200)
    expect(updateData().imageUrl).toBeNull()
    expect(await storedImages()).toEqual([])
  })

  it("keeps the image when the form echoes back its link", async () => {
    const response = await patch({ name: "Nowa nazwa", imageUrl: OLD_LINK })

    expect(response.status).toBe(200)
    expect(updateData()).toEqual({ name: "Nowa nazwa" })
    expect(await storedImages()).toEqual(["p1_1700000000000.jpg"])
  })

  it("keeps the image when imageUrl is not sent at all", async () => {
    await patch({ readme: "# Opis" })

    expect(updateData()).toEqual({ readme: "# Opis" })
    expect(await storedImages()).toEqual(["p1_1700000000000.jpg"])
  })

  it("never adopts a link the client did not get from an upload", async () => {
    const document = join(imagesDir(), "p2", "documents", "offer.pdf")
    await mkdir(join(document, ".."), { recursive: true })
    await writeFile(document, "confidential")

    await patch({ name: "Projekt", imageUrl: "/uploads/projects/p2/documents/offer.pdf" })

    expect(updateData()).toEqual({ name: "Projekt" })
    expect(existsSync(document)).toBe(true)
    expect(existsSync(join(root, OLD_LINK))).toBe(true)
  })

  it("rejects an invalid image and changes nothing", async () => {
    const response = await patch({ name: "Projekt", imageUrl: dataUrl(Buffer.from("<html></html>"), "text/html") })

    expect(response.status).toBe(400)
    expect(db.project.update).not.toHaveBeenCalled()
    expect(await storedImages()).toEqual(["p1_1700000000000.jpg"])
  })

  it("drops the new file and keeps the old one when the update fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    db.project.update.mockRejectedValue(new Error("database is down"))

    const response = await patch({ name: "Projekt", imageUrl: dataUrl(otherJpeg) })

    expect(response.status).toBe(500)
    expect(await storedImages()).toEqual(["p1_1700000000000.jpg"])
  })

  it("moves the inline image of an old record to a file on its next save", async () => {
    const inline = dataUrl(otherJpeg)
    db.project.findFirst.mockResolvedValue({ id: "p1", name: "Projekt", clientId: null, imageUrl: inline })

    const response = await patch({ name: "Projekt", imageUrl: inline })
    const { project } = await response.json()

    expect(project.imageUrl).toMatch(STORED_LINK)
    expect(await readFile(join(root, project.imageUrl))).toEqual(otherJpeg)
  })
})
