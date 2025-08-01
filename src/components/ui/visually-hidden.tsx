"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

/**
 * Visually hides content while keeping it accessible to screen readers.
 * This is useful for providing accessible labels without visual clutter.
 */
export function VisuallyHidden({ 
  children, 
  className, 
  ...props 
}: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "clip-path-[inset(50%)]", // Modern browsers
        className
      )}
      style={{
        clip: "rect(0, 0, 0, 0)", // Fallback for older browsers
      }}
      {...props}
    >
      {children}
    </span>
  )
}
