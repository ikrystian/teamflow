"use client"

import { useEffect, useRef, useState } from "react"

/** Counts from the previously shown value to `target`, so figures roll rather than jump. */
export function useCountUp(target: number, decimals = 0) {
  const [value, setValue] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    const from = shown.current
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900
    const factor = 10 ** decimals
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const t = duration ? Math.min(1, (now - start) / duration) : 1
      shown.current = Math.round((from + (target - from) * (1 - (1 - t) ** 4)) * factor) / factor
      setValue(shown.current)
      if (t < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [target, decimals])

  return value
}
