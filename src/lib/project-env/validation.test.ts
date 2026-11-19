import { describe, expect, it } from "vitest"
import { createEnvFileSchema, ENV_CONTENT_MAX_LENGTH, envFileNameSchema, updateEnvFileSchema } from "./validation"

describe("envFileNameSchema", () => {
  it.each([".env", ".env.local", ".env.production", "production.env", "my_app-1.env"])("akceptuje %s", (name) => {
    expect(envFileNameSchema.safeParse(name).success).toBe(true)
  })

  it.each(["", "   ", "../x", "a/b", "a\\b", ".", "..", "z spacją", "zażółć", "x".repeat(65)])("odrzuca %j", (name) => {
    expect(envFileNameSchema.safeParse(name).success).toBe(false)
  })

  it("przycina białe znaki wokół nazwy", () => {
    expect(envFileNameSchema.parse("  .env  ")).toBe(".env")
  })
})

describe("createEnvFileSchema", () => {
  it("akceptuje nazwę z treścią, także pustą", () => {
    expect(createEnvFileSchema.safeParse({ name: ".env", content: "A=1" }).success).toBe(true)
    expect(createEnvFileSchema.safeParse({ name: ".env", content: "" }).success).toBe(true)
  })

  it("odrzuca treść ponad limit", () => {
    expect(createEnvFileSchema.safeParse({ name: ".env", content: "x".repeat(ENV_CONTENT_MAX_LENGTH + 1) }).success).toBe(false)
    expect(createEnvFileSchema.safeParse({ name: ".env", content: "x".repeat(ENV_CONTENT_MAX_LENGTH) }).success).toBe(true)
  })

  it("wymaga nazwy i treści", () => {
    expect(createEnvFileSchema.safeParse({ content: "A=1" }).success).toBe(false)
    expect(createEnvFileSchema.safeParse({ name: ".env" }).success).toBe(false)
  })
})

describe("updateEnvFileSchema", () => {
  it("pozwala zmienić samą nazwę albo samą treść", () => {
    expect(updateEnvFileSchema.safeParse({ name: ".env.local" }).success).toBe(true)
    expect(updateEnvFileSchema.safeParse({ content: "A=1" }).success).toBe(true)
  })

  it("odrzuca pusty obiekt", () => {
    expect(updateEnvFileSchema.safeParse({}).success).toBe(false)
  })
})
