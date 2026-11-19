import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Trasy prywatnych notatek z bazą i sesją podmienionymi na atrapy.
const db = vi.hoisted(() => ({
  note: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  noteGroup: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
}))
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; email: string; role: string } } }))

vi.mock("@/lib/prisma", () => ({ prisma: db }))
vi.mock("@/lib/auth/session", () => ({ getSession: async () => session.current }))

import { GET as LIST, POST as CREATE } from "./route"
import { DELETE, GET, PATCH } from "./[noteId]/route"
import { POST as CREATE_GROUP } from "../note-groups/route"
import { DELETE as DELETE_GROUP, PATCH as PATCH_GROUP } from "../note-groups/[groupId]/route"
import { MAX_NOTE_GROUPS_PER_USER, MAX_NOTES_PER_USER, NOTE_CONTENT_MAX_LENGTH } from "@/lib/notes/validation"

const now = new Date("2026-11-19T10:00:00Z")
const noteRow = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  groupId: null,
  title: "Tytuł",
  excerpt: "Treść",
  content: "<p>Treść</p>",
  createdAt: now,
  updatedAt: now,
  ...over,
})
const groupRow = (over: Record<string, unknown> = {}) => ({ id: "g1", name: "Praca", position: 0, createdAt: now, ...over })

const json = (method: string, body: unknown) =>
  new NextRequest("http://localhost/api/notes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
const plain = (method = "GET") => new NextRequest("http://localhost/api/notes", { method })
const noteCtx = (noteId = "n1") => ({ params: Promise.resolve({ noteId }) })
const groupCtx = (groupId = "g1") => ({ params: Promise.resolve({ groupId }) })

function signIn(id: string) {
  session.current = { user: { id, email: `${id}@example.com`, role: "user" } }
}

beforeEach(() => {
  vi.clearAllMocks()
  session.current = null
  db.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops))
})

describe("bez sesji", () => {
  it("każda trasa zwraca 401 i nie dotyka bazy", async () => {
    const responses = await Promise.all([
      LIST(),
      CREATE(json("POST", {})),
      GET(plain(), noteCtx()),
      PATCH(json("PATCH", { title: "x" }), noteCtx()),
      DELETE(plain("DELETE"), noteCtx()),
      CREATE_GROUP(json("POST", { name: "x" })),
      PATCH_GROUP(json("PATCH", { name: "x" }), groupCtx()),
      DELETE_GROUP(plain("DELETE"), groupCtx()),
    ])
    expect(responses.map((r) => r.status)).toEqual(Array(8).fill(401))
    for (const model of [db.note, db.noteGroup]) {
      for (const fn of Object.values(model)) expect(fn).not.toHaveBeenCalled()
    }
  })
})

describe("lista notatek", () => {
  it("pobiera wyłącznie notatki i grupy zalogowanej osoby, bez treści", async () => {
    signIn("alice")
    db.noteGroup.findMany.mockResolvedValue([groupRow()])
    db.note.findMany.mockResolvedValue([noteRow({ groupId: "g1" })])

    const res = await LIST()
    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
    expect(db.note.findMany.mock.calls[0][0].where).toEqual({ userId: "alice" })
    expect(db.noteGroup.findMany.mock.calls[0][0].where).toEqual({ userId: "alice" })
    expect(db.note.findMany.mock.calls[0][0].select.content).toBeUndefined()

    const body = await res.json()
    expect(body.groups).toEqual([{ id: "g1", name: "Praca", position: 0, createdAt: now.toISOString() }])
    expect(body.notes).toEqual([{ id: "n1", groupId: "g1", title: "Tytuł", excerpt: "Treść", updatedAt: now.toISOString() }])
  })
})

describe("tworzenie notatki", () => {
  it("zapisuje notatkę z właścicielem, jawnym groupId null i podglądem", async () => {
    signIn("alice")
    db.note.count.mockResolvedValue(0)
    db.note.create.mockResolvedValue(noteRow())

    const res = await CREATE(json("POST", { title: "Plan", content: "<p>Ala &amp; kot</p>" }))
    expect(res.status).toBe(201)
    expect(db.note.create.mock.calls[0][0].data).toEqual({
      userId: "alice",
      groupId: null,
      title: "Plan",
      content: "<p>Ala &amp; kot</p>",
      excerpt: "Ala & kot",
    })
  })

  it("odrzuca cudzą grupę", async () => {
    signIn("bob")
    db.noteGroup.findFirst.mockResolvedValue(null)

    const res = await CREATE(json("POST", { groupId: "g-alice" }))
    expect(res.status).toBe(404)
    expect(db.noteGroup.findFirst.mock.calls[0][0].where).toEqual({ id: "g-alice", userId: "bob" })
    expect(db.note.create).not.toHaveBeenCalled()
  })

  it("odrzuca za długą treść", async () => {
    signIn("alice")
    const res = await CREATE(json("POST", { content: "x".repeat(NOTE_CONTENT_MAX_LENGTH + 1) }))
    expect(res.status).toBe(400)
    expect(db.note.create).not.toHaveBeenCalled()
  })

  it("pilnuje limitu notatek", async () => {
    signIn("alice")
    db.note.count.mockResolvedValue(MAX_NOTES_PER_USER)
    const res = await CREATE(json("POST", {}))
    expect(res.status).toBe(409)
    expect(db.note.create).not.toHaveBeenCalled()
  })
})

describe("cudze notatki", () => {
  it("GET zwraca 404 dla notatki innej osoby", async () => {
    signIn("bob")
    db.note.findFirst.mockResolvedValue(null)

    const res = await GET(plain(), noteCtx("n-alice"))
    expect(res.status).toBe(404)
    expect(db.note.findFirst.mock.calls[0][0].where).toEqual({ id: "n-alice", userId: "bob" })
  })

  it("PATCH nie zmienia notatki innej osoby", async () => {
    signIn("bob")
    db.note.updateMany.mockResolvedValue({ count: 0 })

    const res = await PATCH(json("PATCH", { title: "przejęta" }), noteCtx("n-alice"))
    expect(res.status).toBe(404)
    expect(db.note.updateMany.mock.calls[0][0].where).toEqual({ id: "n-alice", userId: "bob" })
  })

  it("DELETE nie usuwa notatki innej osoby", async () => {
    signIn("bob")
    db.note.deleteMany.mockResolvedValue({ count: 0 })

    const res = await DELETE(plain("DELETE"), noteCtx("n-alice"))
    expect(res.status).toBe(404)
    expect(db.note.deleteMany.mock.calls[0][0].where).toEqual({ id: "n-alice", userId: "bob" })
  })

  it("przeniesienie do cudzej grupy jest odrzucane przed zapisem", async () => {
    signIn("bob")
    db.noteGroup.findFirst.mockResolvedValue(null)

    const res = await PATCH(json("PATCH", { groupId: "g-alice" }), noteCtx("n-bob"))
    expect(res.status).toBe(404)
    expect(db.note.updateMany).not.toHaveBeenCalled()
  })
})

describe("edycja notatki", () => {
  it("przelicza podgląd przy zmianie treści", async () => {
    signIn("alice")
    db.note.updateMany.mockResolvedValue({ count: 1 })
    db.note.findFirst.mockResolvedValue(noteRow({ content: "<ul><li>a</li><li>b</li></ul>", excerpt: "a b" }))

    const res = await PATCH(json("PATCH", { content: "<ul><li>a</li><li>b</li></ul>" }), noteCtx())
    expect(res.status).toBe(200)
    const { data } = db.note.updateMany.mock.calls[0][0]
    expect(data).toMatchObject({ content: "<ul><li>a</li><li>b</li></ul>", excerpt: "a b" })
    expect(data.title).toBeUndefined()
    expect(data.groupId).toBeUndefined()
  })

  it("pozwala wyjąć notatkę z grupy", async () => {
    signIn("alice")
    db.note.updateMany.mockResolvedValue({ count: 1 })
    db.note.findFirst.mockResolvedValue(noteRow())

    const res = await PATCH(json("PATCH", { groupId: null }), noteCtx())
    expect(res.status).toBe(200)
    expect(db.noteGroup.findFirst).not.toHaveBeenCalled()
    expect(db.note.updateMany.mock.calls[0][0].data.groupId).toBeNull()
  })

  it("odrzuca pustą zmianę", async () => {
    signIn("alice")
    const res = await PATCH(json("PATCH", {}), noteCtx())
    expect(res.status).toBe(400)
  })
})

describe("grupy", () => {
  it("nowa grupa trafia na koniec listy", async () => {
    signIn("alice")
    db.noteGroup.count.mockResolvedValue(3)
    db.noteGroup.create.mockResolvedValue(groupRow({ position: 3 }))

    const res = await CREATE_GROUP(json("POST", { name: "  Pomysły  " }))
    expect(res.status).toBe(201)
    expect(db.noteGroup.create.mock.calls[0][0].data).toEqual({ userId: "alice", name: "Pomysły", position: 3 })
  })

  it("odrzuca pustą nazwę", async () => {
    signIn("alice")
    const res = await CREATE_GROUP(json("POST", { name: "   " }))
    expect(res.status).toBe(400)
    expect(db.noteGroup.create).not.toHaveBeenCalled()
  })

  it("pilnuje limitu grup", async () => {
    signIn("alice")
    db.noteGroup.count.mockResolvedValue(MAX_NOTE_GROUPS_PER_USER)
    const res = await CREATE_GROUP(json("POST", { name: "Kolejna" }))
    expect(res.status).toBe(409)
  })

  it("zmiana nazwy cudzej grupy zwraca 404", async () => {
    signIn("bob")
    db.noteGroup.updateMany.mockResolvedValue({ count: 0 })

    const res = await PATCH_GROUP(json("PATCH", { name: "Moja" }), groupCtx("g-alice"))
    expect(res.status).toBe(404)
    expect(db.noteGroup.updateMany.mock.calls[0][0].where).toEqual({ id: "g-alice", userId: "bob" })
  })

  it("usunięcie grupy przenosi jej notatki do „Bez grupy”", async () => {
    signIn("alice")
    db.noteGroup.findFirst.mockResolvedValue({ id: "g1" })
    db.note.updateMany.mockResolvedValue({ count: 2 })
    db.noteGroup.deleteMany.mockResolvedValue({ count: 1 })

    const res = await DELETE_GROUP(plain("DELETE"), groupCtx())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, movedNotes: 2 })
    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(db.note.updateMany).toHaveBeenCalledWith({ where: { userId: "alice", groupId: "g1" }, data: { groupId: null } })
    expect(db.noteGroup.deleteMany).toHaveBeenCalledWith({ where: { id: "g1", userId: "alice" } })
    expect(db.note.deleteMany).not.toHaveBeenCalled()
  })

  it("usunięcie cudzej grupy nie zmienia niczego", async () => {
    signIn("bob")
    db.noteGroup.findFirst.mockResolvedValue(null)

    const res = await DELETE_GROUP(plain("DELETE"), groupCtx("g-alice"))
    expect(res.status).toBe(404)
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(db.note.updateMany).not.toHaveBeenCalled()
  })
})
