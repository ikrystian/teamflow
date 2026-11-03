/**
 * Pure helpers behind the touch gestures (swipe between days, swipe a sheet
 * away, flick through images). Kept free of DOM access so the thresholds can be
 * unit-tested; the event wiring lives in src/hooks/use-swipe.ts.
 */

export type SwipeAxis = "x" | "y"
export type SwipeDirection = "left" | "right" | "up" | "down"

/** Distance (px) a touch travels before we decide which axis it moves along. */
export const AXIS_LOCK_DISTANCE = 10

/**
 * The axis a gesture moves along once it has travelled far enough, or null
 * while it is still undecided. Diagonal moves count for the dominant axis.
 */
export function lockAxis(dx: number, dy: number, distance = AXIS_LOCK_DISTANCE): SwipeAxis | null {
  if (Math.hypot(dx, dy) < distance) return null
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y"
}

/** Direction of a movement along an axis (negative = left / up). */
export function swipeDirection(axis: SwipeAxis, delta: number): SwipeDirection {
  if (axis === "x") return delta < 0 ? "left" : "right"
  return delta < 0 ? "up" : "down"
}

export interface SwipeThresholds {
  /** Travel (px) that always counts as a swipe. */
  distance?: number
  /** Release speed (px/ms) that counts as a flick even over a short distance. */
  velocity?: number
}

/**
 * Whether a released gesture was a swipe: it travelled far enough, or it was
 * flicked fast in the direction it travelled. A drag that the finger pulled
 * back at the end (release velocity against the travel) never counts, so users
 * can change their mind mid-gesture.
 */
export function isSwipe(delta: number, releaseVelocity: number, { distance = 60, velocity = 0.45 }: SwipeThresholds = {}): boolean {
  if (delta === 0) return false
  const sameDirection = Math.sign(releaseVelocity) === Math.sign(delta)
  if (!sameDirection && Math.abs(releaseVelocity) > 0.1) return false
  if (Math.abs(delta) >= distance) return true
  return Math.abs(delta) >= 16 && sameDirection && Math.abs(releaseVelocity) >= velocity
}

/**
 * Offset applied to a dragged surface: it follows the finger 1:1 toward the
 * dismiss direction and resists (moves at a fraction of the finger) the other way.
 */
export function dismissOffset(delta: number, dismissSign: 1 | -1, resistance = 0.2): number {
  return delta * dismissSign >= 0 ? delta : delta * resistance
}

/** Release velocity (px/ms) from timestamped positions, using the last `windowMs`. */
export function releaseVelocity(samples: ReadonlyArray<{ position: number; time: number }>, windowMs = 100): number {
  if (samples.length < 2) return 0
  const last = samples[samples.length - 1]
  let first = samples[0]
  for (const sample of samples) {
    if (last.time - sample.time <= windowMs) {
      first = sample
      break
    }
  }
  const elapsed = last.time - first.time
  return elapsed > 0 ? (last.position - first.position) / elapsed : 0
}
