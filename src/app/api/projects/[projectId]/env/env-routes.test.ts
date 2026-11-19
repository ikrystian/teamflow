import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

// Trasy plików .env z bazą i sesją podmienionymi na atrapy; szyfrowanie działa naprawdę.
const db = vi.hoisted(() => ({
  project: { findUnique: vi.fn() },
  projectEnvFile: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  user: { findMany: vi.fn() },
}))
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; email: string; role: string } } }))

vi.mock("@/lib/prisma", () => ({ prisma: db }))
vi.mock("@/lib/auth/session", () => ({ getSession: async () => session.current }))

import { GET, POST } from "./route"
import { DELETE, GET as GET_FILE, PATCH } from "./[fileId]/route"
import { decryptEnv } from "@/lib/project-env/crypto"
import { getEnvKey } from "@/lib/project-env/access"

const PROJECT_ID = "p1"
const ctx = { params: Promise.resolve({ projectId: PROJECT_ID }) }
const fileCtx = (fileId = "f1") => ({ params: Promise.resolve({ projectId: PROJECT_ID, fileId }) })
const SECRET = "STRIPE_KEY=sk_live_super_secret"

const json = (method: string, body: unknown) =>
  new NextRequest("http://localhost/api/projects/p1/env", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
const plain = (method = "GET") => new NextRequest("http://localhost/api/projects/p1/env", { method })

function signIn(user: { id: string; role?: string; email?: string }) {
  session.current = { user: { id: user.id, role: user.role ?? "user", email: user.email ?? `${user.id}@example.com` } }
}
function projectOf(createdById: string, memberIds: string[] = [], forUser?: string) {
  db.project.findUnique.mockResolvedValue({
    id: PROJECT_ID,
    createdById,
    members: memberIds.filter((id) => id === forUser).map((id) => ({ id: `m-${id}` })),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  session.current = null
})

describe("dostęp do plików .env projektu", () => {
  it("niezalogowany dostaje 401", async () => {
    expect((await GET(plain(), ctx)).status).toBe(401)
    expect((await GET_FILE(plain(), fileCtx())).status).toBe(401)
    expect(db.projectEnvFile.findMany).not.toHaveBeenCalled()
  })

  it("zalogowany spoza projektu dostaje 404 na każdej trasie i nic nie czyta", async () => {
    signIn({ id: "outsider" })
    projectOf("owner", ["someone-else"], "outsider")
    expect((await GET(plain(), ctx)).status).toBe(404)
    expect((await POST(json("POST", { name: ".env", content: SECRET }), ctx)).status).toBe(404)
    expect((await GET_FILE(plain(), fileCtx())).status).toBe(404)
    expect((await PATCH(json("PATCH", { content: "A=1" }), fileCtx())).status).toBe(404)
    expect((await DELETE(plain("DELETE"), fileCtx())).status).toBe(404)
    expect(db.projectEnvFile.findMany).not.toHaveBeenCalled()
    expect(db.projectEnvFile.create).not.toHaveBeenCalled()
    expect(db.projectEnvFile.deleteMany).not.toHaveBeenCalled()
  })

  it("nieistniejący projekt to 404", async () => {
    signIn({ id: "owner" })
    db.project.findUnique.mockResolvedValue(null)
    expect((await GET(plain(), ctx)).status).toBe(404)
  })

  it.each([
    ["twórca", { id: "owner" }, () => projectOf("owner")],
    ["członek", { id: "member" }, () => projectOf("owner", ["member"], "member")],
    ["administrator systemu", { id: "boss", role: "admin" }, () => projectOf("owner")],
  ])("%s ma dostęp", async (_label, user, setup) => {
    signIn(user)
    setup()
    db.projectEnvFile.findMany.mockResolvedValue([])
    expect((await GET(plain(), ctx)).status).toBe(200)
  })
})

describe("zapis i odczyt", () => {
  beforeEach(() => {
    signIn({ id: "owner" })
    projectOf("owner")
  })

  it("zapisuje w bazie wyłącznie szyfrogram i liczbę zmiennych", async () => {
    db.projectEnvFile.create.mockResolvedValue({ id: "f1", name: ".env", varCount: 2 })
    const res = await POST(json("POST", { name: ".env", content: `A=1\n${SECRET}` }), ctx)
    expect(res.status).toBe(201)

    const data = db.projectEnvFile.create.mock.calls[0][0].data
    expect(JSON.stringify(data)).not.toContain("sk_live_super_secret")
    expect(data).toMatchObject({ projectId: PROJECT_ID, name: ".env", varCount: 2, createdById: "owner", updatedById: "owner" })
    expect(decryptEnv(data.ciphertext, PROJECT_ID, getEnvKey())).toBe(`A=1\n${SECRET}`)
  })

  it("odpowiada 409 przy zajętej nazwie", async () => {
    db.projectEnvFile.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "test" }))
    const res = await POST(json("POST", { name: ".env", content: "A=1" }), ctx)
    expect(res.status).toBe(409)
  })

  it("odrzuca niepoprawną nazwę i niepoprawny JSON (400)", async () => {
    expect((await POST(json("POST", { name: "../etc/passwd", content: "A=1" }), ctx)).status).toBe(400)
    const broken = new NextRequest("http://localhost/api/projects/p1/env", { method: "POST", body: "{nie json" })
    expect((await POST(broken, ctx)).status).toBe(400)
    expect(db.projectEnvFile.create).not.toHaveBeenCalled()
  })

  it("lista zawiera metadane, ale nie treść ani szyfrogram", async () => {
    db.projectEnvFile.findMany.mockResolvedValue([
      { id: "f1", name: ".env", varCount: 3, createdAt: new Date(0), updatedAt: new Date(0), updatedById: "owner" },
    ])
    db.user.findMany.mockResolvedValue([{ id: "owner", name: "Anna", email: "anna@example.com" }])
    const res = await GET(plain(), ctx)
    const body = await res.json()
    expect(body.files).toEqual([
      { id: "f1", name: ".env", varCount: 3, createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), updatedBy: { id: "owner", name: "Anna" } },
    ])
    expect(db.projectEnvFile.findMany.mock.calls[0][0].select).not.toHaveProperty("ciphertext")
    expect(res.headers.get("Cache-Control")).toBe("no-store")
  })

  it("GET pliku zwraca odszyfrowaną treść z no-store", async () => {
    // Ten sam szyfrogram, który zapisałaby trasa POST.
    db.projectEnvFile.create.mockResolvedValue({ id: "f1", name: ".env", varCount: 1 })
    await POST(json("POST", { name: ".env", content: SECRET }), ctx)
    const { ciphertext } = db.projectEnvFile.create.mock.calls[0][0].data

    db.projectEnvFile.findFirst.mockResolvedValue({ id: "f1", name: ".env", varCount: 1, updatedAt: new Date(0), ciphertext })
    const res = await GET_FILE(plain(), fileCtx())
    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
    expect((await res.json()).file.content).toBe(SECRET)
    expect(db.projectEnvFile.findFirst).toHaveBeenCalledWith({ where: { id: "f1", projectId: PROJECT_ID } })
  })

  it("nieodszyfrowywalny plik daje czytelny błąd 500 bez wycieku danych", async () => {
    db.projectEnvFile.findFirst.mockResolvedValue({ id: "f1", name: ".env", varCount: 1, updatedAt: new Date(0), ciphertext: "v1.AAAA" })
    const res = await GET_FILE(plain(), fileCtx())
    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/ENV_ENCRYPTION_KEY/)
  })

  it("PATCH ponownie szyfruje treść i przelicza zmienne; sama zmiana nazwy nie rusza szyfrogramu", async () => {
    db.projectEnvFile.findFirst.mockResolvedValue({ id: "f1" })
    db.projectEnvFile.update.mockResolvedValue({ id: "f1", name: ".env", varCount: 1 })

    await PATCH(json("PATCH", { content: "NEW=1" }), fileCtx())
    const withContent = db.projectEnvFile.update.mock.calls[0][0].data
    expect(withContent).toMatchObject({ varCount: 1, updatedById: "owner" })
    expect(decryptEnv(withContent.ciphertext, PROJECT_ID, getEnvKey())).toBe("NEW=1")

    await PATCH(json("PATCH", { name: ".env.local" }), fileCtx())
    const renameOnly = db.projectEnvFile.update.mock.calls[1][0].data
    expect(renameOnly).toEqual({ name: ".env.local", updatedById: "owner" })
  })

  it("DELETE usuwa tylko plik z tego projektu; brak pliku to 404", async () => {
    db.projectEnvFile.deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    expect((await DELETE(plain("DELETE"), fileCtx())).status).toBe(200)
    expect(db.projectEnvFile.deleteMany).toHaveBeenCalledWith({ where: { id: "f1", projectId: PROJECT_ID } })
    expect((await DELETE(plain("DELETE"), fileCtx("missing"))).status).toBe(404)
  })
})
