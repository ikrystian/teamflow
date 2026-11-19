import { describe, expect, it } from "vitest"
import { changelogCutoff } from "./changelog-shared"

describe("changelogCutoff", () => {
  const created = new Date("2026-03-01T10:00:00Z")

  it("uses the account creation date when nothing was seen yet", () => {
    expect(changelogCutoff(null, created)).toBe(created)
    expect(changelogCutoff(undefined, created)).toBe(created)
  })

  it("never goes back before the account was created", () => {
    expect(changelogCutoff(new Date("2026-01-15T00:00:00Z"), created)).toBe(created)
  })

  it("uses the last seen entry when it is newer than the account", () => {
    const seen = new Date("2026-06-10T08:30:00Z")
    expect(changelogCutoff(seen, created)).toBe(seen)
  })
})
