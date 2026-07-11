"use client"

import { useEffect, useCallback } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react"
import { DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"

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

// Pełnoekranowy podgląd obrazków z nawigacją strzałkami (klawiatura i przyciski).
// Radix Dialog zapewnia zamykanie po Esc / kliknięciu tła i blokadę fokusa.
export function ImageLightbox({ images, index, open, onOpenChange, onIndexChange }: ImageLightboxProps) {
  const hasMany = images.length > 1

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

  const image = images[index]
  if (!image) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/80 z-[9998]" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[9999] flex items-center justify-center outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          onClick={() => onOpenChange(false)}
        >
          <VisuallyHidden>
            <DialogTitle>{image.name || "Podgląd obrazka"}</DialogTitle>
          </VisuallyHidden>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.name || ""}
            className="max-h-[90vh] max-w-[92vw] object-contain rounded shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Pasek z nazwą pliku i licznikiem */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-black/60 px-4 py-1.5 text-xs text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {image.name && <span className="max-w-[50vw] truncate">{image.name}</span>}
            {hasMany && <span className="font-mono">{index + 1} / {images.length}</span>}
            <a
              href={image.url}
              download={image.name}
              className="hover:text-white/70 transition-colors"
              title="Pobierz"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>

          {hasMany && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                title="Poprzedni (←)"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                title="Następny (→)"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <DialogPrimitive.Close
            className="absolute top-3 right-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
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
