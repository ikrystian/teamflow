import { randomBytes } from "node:crypto"
import { describe, expect, it } from "vitest"
import { decryptEnv, encryptEnv } from "./crypto"

const key = randomBytes(32)
const PROJECT = "project-1"
const SAMPLE = "# produkcja\nDATABASE_URL=postgres://user:p@ss=word@db:5432/app\nSECRET=zażółć gęślą jaźń 🔐\n\nEMPTY=\n"

describe("encryptEnv / decryptEnv", () => {
  it("odtwarza treść (wiele linii, unicode, znaki =)", () => {
    expect(decryptEnv(encryptEnv(SAMPLE, PROJECT, key), PROJECT, key)).toBe(SAMPLE)
  })

  it("obsługuje pustą treść", () => {
    expect(decryptEnv(encryptEnv("", PROJECT, key), PROJECT, key)).toBe("")
  })

  it("zapisuje w formacie v1 i nie zawiera jawnego tekstu", () => {
    const blob = encryptEnv(SAMPLE, PROJECT, key)
    expect(blob.startsWith("v1.")).toBe(true)
    expect(blob).not.toContain("DATABASE_URL")
    expect(Buffer.from(blob.slice(3), "base64url").toString("utf8")).not.toContain("postgres://")
  })

  it("używa nowego IV przy każdym szyfrowaniu", () => {
    expect(encryptEnv(SAMPLE, PROJECT, key)).not.toBe(encryptEnv(SAMPLE, PROJECT, key))
  })

  it("odrzuca szyfrogram z innego projektu (inne AAD)", () => {
    const blob = encryptEnv(SAMPLE, PROJECT, key)
    expect(() => decryptEnv(blob, "project-2", key)).toThrow()
  })

  it("odrzuca zły klucz", () => {
    const blob = encryptEnv(SAMPLE, PROJECT, key)
    expect(() => decryptEnv(blob, PROJECT, randomBytes(32))).toThrow()
  })

  it("odrzuca zmodyfikowany szyfrogram", () => {
    const blob = encryptEnv(SAMPLE, PROJECT, key)
    const raw = Buffer.from(blob.slice(3), "base64url")
    raw[raw.length - 1] ^= 0x01
    expect(() => decryptEnv(`v1.${raw.toString("base64url")}`, PROJECT, key)).toThrow()
  })

  it("odrzuca zmodyfikowany tag uwierzytelniający", () => {
    const blob = encryptEnv(SAMPLE, PROJECT, key)
    const raw = Buffer.from(blob.slice(3), "base64url")
    raw[12] ^= 0x01 // pierwszy bajt tagu (po 12-bajtowym IV)
    expect(() => decryptEnv(`v1.${raw.toString("base64url")}`, PROJECT, key)).toThrow()
  })

  it("odrzuca nieznaną wersję formatu i uszkodzone dane", () => {
    const blob = encryptEnv(SAMPLE, PROJECT, key)
    expect(() => decryptEnv(blob.replace(/^v1\./, "v2."), PROJECT, key)).toThrow(/format/i)
    expect(() => decryptEnv("bez-kropki", PROJECT, key)).toThrow(/format/i)
    expect(() => decryptEnv("v1.AAAA", PROJECT, key)).toThrow(/Uszkodzony/)
  })

  it("wymaga klucza 32-bajtowego", () => {
    expect(() => encryptEnv(SAMPLE, PROJECT, randomBytes(16))).toThrow(/32 bajty/)
    expect(() => decryptEnv("v1.AAAA", PROJECT, randomBytes(31))).toThrow(/32 bajty/)
  })
})
