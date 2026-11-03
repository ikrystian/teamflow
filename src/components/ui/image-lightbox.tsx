"use client"

import { useEffect, useCallback, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react"
import { DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { useSwipe } from "@/hooks/use-swipe"
import { cn } from "@/lib/utils"

export interface LightboxImage {
  url: string
  name?: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  /** Index of the currently shown image. */
  index: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onIndexChange: (index: number) => void
}

// Pełnoekranowy podgląd obrazków z nawigacją strzałkami (klawiatura i przyciski)
// oraz gestami: przesunięcie w bok zmienia obrazek, w dół zamyka podgląd.
// Radix Dialog zapewnia zamykanie po Esc / kliknięciu tła i blokadę fokusa.
export function ImageLightbox({ images, index, open, onOpenChange, onIndexChange }: ImageLightboxProps) {
  const hasMany = images.length > 1
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  // Pinch-zoomed in: one finger pans the zoomed page, so the swipes stand down.
  const [zoomed, setZoomed] = useState(false)

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + images.length) % images.length)
  }, [index, images.length, onIndexChange])

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % images.length)
  }, [index, images.length, onIndexChange])

  useEffect(() => {
    if (!open || !hasMany) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, hasMany, goPrev, goNext])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!open || !viewport) return
    const update = () => setZoomed(viewport.scale > 1.01)
    update()
    viewport.addEventListener("resize", update)
    return () => viewport.removeEventListener("resize", update)
  }, [open])

  // The image follows the finger, then springs back (or the next one takes its place).
  const dragImage = (stageElement: HTMLElement, x: number, y: number) => {
    const img = stageElement.querySelector<HTMLImageElement>("[data-lightbox-image]")
    if (!img) return
    img.style.transition = "none"
    img.style.transform = `translate3d(${x}px, ${y}px, 0)`
    img.style.opacity = y > 0 ? String(Math.max(0.4, 1 - y / 400)) : ""
  }
  const settleImage = (stageElement: HTMLElement) => {
    const img = stageElement.querySelector<HTMLImageElement>("[data-lightbox-image]")
    if (!img) return
    img.style.transition = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms"
    img.style.transform = ""
    img.style.opacity = ""
  }

  useSwipe(stage, {
    axis: "x",
    enabled: open && hasMany && !zoomed,
    onMove: (dx, el) => dragImage(el, dx, 0),
    onSwipe: (direction) => (direction === "left" ? goNext() : goPrev()),
    onEnd: (_, el) => settleImage(el),
  })
  useSwipe(stage, {
    axis: "y",
    enabled: open && !zoomed,
    onMove: (dy, el) => dragImage(el, 0, Math.max(0, dy)),
    onSwipe: (direction) => {
      if (direction === "down") onOpenChange(false)
    },
    onEnd: ({ swiped, delta }, el) => {
      if (!(swiped && delta > 0)) settleImage(el)
    },
  })

  const current = images[index]
  if (!current) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/80 z-[9998]" />
        <DialogPrimitive.Content
          ref={setStage}
          className={cn(
            "fixed inset-0 z-[9999] flex items-center justify-center outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            // Single-finger moves are the swipes; pinch zoom stays native.
            !zoomed && "touch-pinch-zoom"
          )}
          onClick={() => onOpenChange(false)}
        >
          <VisuallyHidden>
            <DialogTitle>{current.name || "Podgląd obrazka"}</DialogTitle>
          </VisuallyHidden>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-lightbox-image
            key={current.url}
            src={current.url}
            alt={current.name || ""}
            className="max-h-[90dvh] max-w-[92vw] object-contain rounded shadow-2xl select-none animate-in fade-in-0 duration-200"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Pasek z nazwą pliku i licznikiem */}
          <div
            className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-black/60 py-1.5 pr-1.5 pl-4 text-xs text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {current.name && <span className="max-w-[50vw] truncate">{current.name}</span>}
            {hasMany && (
              <span className="font-mono" aria-live="polite">
                {index + 1} / {images.length}
              </span>
            )}
            <a
              href={current.url}
              download={current.name}
              className="flex size-8 items-center justify-center rounded-full hover:bg-white/10 hover:text-white/70 transition-colors"
              title="Pobierz"
              aria-label="Pobierz obrazek"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>

          {hasMany && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors pointer-coarse:p-2.5"
                title="Poprzedni (←)"
                aria-label="Poprzedni obrazek"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors pointer-coarse:p-2.5"
                title="Następny (→)"
                aria-label="Następny obrazek"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <DialogPrimitive.Close
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors pointer-coarse:p-2.5"
            title="Zamknij (Esc)"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Zamknij</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}
