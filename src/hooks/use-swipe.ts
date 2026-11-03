"use client"

import { useEffect, useEffectEvent } from "react"
import {
  dismissOffset,
  isSwipe,
  lockAxis,
  releaseVelocity,
  swipeDirection,
  type SwipeAxis,
  type SwipeDirection,
  type SwipeThresholds,
} from "@/lib/gestures"

export interface SwipeEnd {
  /** onSwipe fired for this gesture. */
  swiped: boolean
  /** Distance travelled along the axis (0 when the browser cancelled the touch). */
  delta: number
  /** Release velocity along the axis, px/ms. */
  velocity: number
}

export interface UseSwipeOptions extends SwipeThresholds {
  /** Axis the gesture tracks. Touches that move along the other axis are left to the browser. */
  axis: SwipeAxis
  enabled?: boolean
  /** Only start when the touch begins inside an element matching this selector (e.g. a grab handle). */
  handle?: string
  /** Every move along the locked axis, with the distance travelled since the touch started. */
  onMove?: (delta: number, element: HTMLElement) => void
  /** The touch was released past the swipe threshold. */
  onSwipe?: (direction: SwipeDirection) => void
  /** The gesture ended, swiped or not; use it to settle whatever onMove moved. */
  onEnd?: (end: SwipeEnd, element: HTMLElement) => void
}

// Text entry keeps its own touch behaviour (moving the caret, selecting text).
const IGNORED_TARGETS = "input, textarea, select, [contenteditable='true'], [data-swipe-ignore]"

/**
 * Whether an element between the touch target and the gesture root could
 * scroll in the swipe direction itself — then the swipe belongs to it.
 */
function nestedScrollerCanScroll(target: Element, root: Element, direction: SwipeDirection): boolean {
  for (let el: Element | null = target; el && el !== root.parentElement; el = el.parentElement) {
    const style = getComputedStyle(el)
    if (direction === "left" || direction === "right") {
      if (!/(auto|scroll)/.test(style.overflowX) || el.scrollWidth <= el.clientWidth) continue
      // A finger moving left reveals content on the right.
      if (direction === "left" && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true
      if (direction === "right" && el.scrollLeft > 0) return true
    } else {
      if (!/(auto|scroll)/.test(style.overflowY) || el.scrollHeight <= el.clientHeight) continue
      if (direction === "down" && el.scrollTop > 0) return true
      if (direction === "up" && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
    }
  }
  return false
}

/**
 * One-finger swipe along a single axis on touch screens. Listeners are passive,
 * so scrolling along the other axis stays native; give the element a
 * `touch-action` without this axis (e.g. `touch-pan-y` for "x") so the browser
 * doesn't pan along it as well. Ignores pinch-zoomed pages, text fields and
 * nested scrollers that can still scroll the same way.
 */
export function useSwipe(element: HTMLElement | null, options: UseSwipeOptions) {
  // Callbacks change every render; the listeners stay attached and read the latest ones.
  const latestOptions = useEffectEvent(() => options)
  const enabled = options.enabled ?? true

  useEffect(() => {
    const root = element
    if (!root || !enabled) return

    let start: { x: number; y: number; target: Element } | null = null
    let active = false
    let delta = 0
    let samples: Array<{ position: number; time: number }> = []

    const reset = () => {
      start = null
      active = false
      delta = 0
      samples = []
    }

    const onTouchStart = (event: TouchEvent) => {
      reset()
      const target = event.target as Element | null
      if (event.touches.length !== 1 || !target) return
      // A pinch-zoomed page pans with one finger; don't hijack that.
      if (window.visualViewport && window.visualViewport.scale > 1.01) return
      if (target.closest(IGNORED_TARGETS)) return
      const { handle } = latestOptions()
      if (handle && !target.closest(handle)) return
      const touch = event.touches[0]
      start = { x: touch.clientX, y: touch.clientY, target }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!start) return
      if (event.touches.length !== 1) {
        if (active) latestOptions().onEnd?.({ swiped: false, delta: 0, velocity: 0 }, root)
        return reset()
      }
      const { axis, onMove } = latestOptions()
      const touch = event.touches[0]
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y

      if (!active) {
        const locked = lockAxis(dx, dy)
        if (!locked) return
        if (locked !== axis || nestedScrollerCanScroll(start.target, root, swipeDirection(axis, axis === "x" ? dx : dy))) {
          return reset()
        }
        active = true
      }

      delta = axis === "x" ? dx : dy
      samples.push({ position: delta, time: event.timeStamp })
      if (samples.length > 12) samples.shift()
      onMove?.(delta, root)
    }

    const onTouchEnd = () => {
      if (!active) return reset()
      const { axis, distance, velocity, onSwipe, onEnd } = latestOptions()
      const speed = releaseVelocity(samples)
      const swiped = isSwipe(delta, speed, { distance, velocity })
      if (swiped) onSwipe?.(swipeDirection(axis, delta))
      onEnd?.({ swiped, delta, velocity: speed }, root)
      reset()
    }

    // A native drag (long-press on a card) or the browser taking over cancels the touch.
    const onTouchCancel = () => {
      if (active) latestOptions().onEnd?.({ swiped: false, delta: 0, velocity: 0 }, root)
      reset()
    }

    root.addEventListener("touchstart", onTouchStart, { passive: true })
    root.addEventListener("touchmove", onTouchMove, { passive: true })
    root.addEventListener("touchend", onTouchEnd)
    root.addEventListener("touchcancel", onTouchCancel)
    return () => {
      root.removeEventListener("touchstart", onTouchStart)
      root.removeEventListener("touchmove", onTouchMove)
      root.removeEventListener("touchend", onTouchEnd)
      root.removeEventListener("touchcancel", onTouchCancel)
    }
  }, [element, enabled])
}

export interface UseSwipeToDismissOptions {
  /** Edge the surface leaves through, e.g. "left" for a sheet that slid in from the left. */
  direction: "left" | "right" | "down"
  onDismiss: () => void
  enabled?: boolean
  handle?: string
}

/**
 * Drag a sheet or dialog toward its edge to close it: the surface follows the
 * finger, closes past ~35% of its size (or on a flick) and springs back
 * otherwise. On dismiss the dragged offset stays in place, so the closing
 * animation continues from where the finger let go.
 */
export function useSwipeToDismiss(
  element: HTMLElement | null,
  { direction, onDismiss, enabled, handle }: UseSwipeToDismissOptions
) {
  const axis: SwipeAxis = direction === "down" ? "y" : "x"
  const sign = direction === "left" ? -1 : 1

  useSwipe(element, {
    axis,
    enabled,
    handle,
    onMove: (delta, el) => {
      const offset = dismissOffset(delta, sign)
      el.style.transition = "none"
      el.style.transform = axis === "x" ? `translate3d(${offset}px, 0, 0)` : `translate3d(0, ${offset}px, 0)`
    },
    onEnd: ({ delta, velocity }, el) => {
      const size = axis === "x" ? el.offsetWidth : el.offsetHeight
      if (delta * sign > 0 && isSwipe(delta, velocity, { distance: size * 0.35 })) {
        onDismiss()
        return
      }
      el.style.transition = "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)"
      el.style.transform = ""
      el.addEventListener("transitionend", () => { el.style.transition = "" }, { once: true })
    },
  })
}
