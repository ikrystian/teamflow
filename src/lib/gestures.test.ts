import { describe, expect, it } from "vitest"
import { dismissOffset, isSwipe, lockAxis, releaseVelocity, swipeDirection } from "./gestures"

describe("lockAxis", () => {
  it("stays undecided until the touch travelled far enough", () => {
    expect(lockAxis(4, 5)).toBeNull()
    expect(lockAxis(0, 0)).toBeNull()
  })

  it("picks the dominant axis of a diagonal move", () => {
    expect(lockAxis(12, 3)).toBe("x")
    expect(lockAxis(-3, -14)).toBe("y")
    expect(lockAxis(8, 8)).toBe("y")
  })
})

describe("swipeDirection", () => {
  it("maps the sign of the movement to a direction", () => {
    expect(swipeDirection("x", -20)).toBe("left")
    expect(swipeDirection("x", 20)).toBe("right")
    expect(swipeDirection("y", -20)).toBe("up")
    expect(swipeDirection("y", 20)).toBe("down")
  })
})

describe("isSwipe", () => {
  it("accepts a long drag released at rest", () => {
    expect(isSwipe(80, 0)).toBe(true)
    expect(isSwipe(-80, 0)).toBe(true)
  })

  it("accepts a short but fast flick", () => {
    expect(isSwipe(30, 0.8)).toBe(true)
    expect(isSwipe(-30, -0.8)).toBe(true)
  })

  it("rejects short, slow movements and taps", () => {
    expect(isSwipe(30, 0.1)).toBe(false)
    expect(isSwipe(10, 2)).toBe(false)
    expect(isSwipe(0, 0)).toBe(false)
  })

  it("rejects a drag the finger pulled back before releasing", () => {
    expect(isSwipe(120, -0.5)).toBe(false)
    expect(isSwipe(-120, 0.5)).toBe(false)
  })

  it("respects custom thresholds", () => {
    expect(isSwipe(100, 0, { distance: 150 })).toBe(false)
    expect(isSwipe(160, 0, { distance: 150 })).toBe(true)
  })
})

describe("dismissOffset", () => {
  it("follows the finger toward the dismiss direction", () => {
    expect(dismissOffset(50, 1)).toBe(50)
    expect(dismissOffset(-50, -1)).toBe(-50)
  })

  it("resists movement away from the dismiss direction", () => {
    expect(dismissOffset(-50, 1)).toBe(-10)
    expect(dismissOffset(50, -1)).toBe(10)
  })
})

describe("releaseVelocity", () => {
  it("measures only the final stretch of the gesture", () => {
    const samples = [
      { position: 0, time: 0 },
      { position: 10, time: 400 },
      { position: 20, time: 450 },
      { position: 70, time: 500 },
    ]
    expect(releaseVelocity(samples)).toBeCloseTo(60 / 100)
  })

  it("is zero without movement over time", () => {
    expect(releaseVelocity([])).toBe(0)
    expect(releaseVelocity([{ position: 5, time: 10 }])).toBe(0)
    expect(releaseVelocity([{ position: 5, time: 10 }, { position: 9, time: 10 }])).toBe(0)
  })
})
