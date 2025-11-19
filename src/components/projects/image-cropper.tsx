"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface ImageCropperProps {
  imageUrl: string
  open: boolean
  onClose: () => void
  onCropComplete: (croppedImageUrl: string) => void
  aspectRatio?: number
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function ImageCropper({
  imageUrl,
  open,
  onClose,
  onCropComplete,
  aspectRatio = 11 / 5 // Default 11:5 aspect ratio
}: ImageCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (imageUrl && open) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        setImage(img)
        initializeCropArea(img)
      }
      img.src = imageUrl
    }
  }, [imageUrl, open])

  const initializeCropArea = (img: HTMLImageElement) => {
    const container = containerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Calculate scale to fit image in container
    const scale = Math.min(
      containerWidth / img.width,
      containerHeight / img.height
    )

    const displayWidth = img.width * scale
    const displayHeight = img.height * scale

    // Initialize crop area to center with aspect ratio 11:5
    let cropWidth = displayWidth * 0.8
    let cropHeight = cropWidth / aspectRatio

    // If crop height is too large, adjust based on height
    if (cropHeight > displayHeight * 0.8) {
      cropHeight = displayHeight * 0.8
      cropWidth = cropHeight * aspectRatio
    }

    const cropX = (displayWidth - cropWidth) / 2
    const cropY = (displayHeight - cropHeight) / 2

    setCropArea({
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if click is inside crop area
    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true)
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || !image) return

    const rect = canvasRef.current.getBoundingClientRect()
    const container = containerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const scale = Math.min(
      containerWidth / image.width,
      containerHeight / image.height
    )
    const displayWidth = image.width * scale
    const displayHeight = image.height * scale

    let newX = e.clientX - rect.left - dragStart.x
    let newY = e.clientY - rect.top - dragStart.y

    // Constrain to image bounds
    newX = Math.max(0, Math.min(newX, displayWidth - cropArea.width))
    newY = Math.max(0, Math.min(newY, displayHeight - cropArea.height))

    setCropArea(prev => ({ ...prev, x: newX, y: newY }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (!image || !containerRef.current) return

    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const scale = Math.min(
      containerWidth / image.width,
      containerHeight / image.height
    )
    const displayWidth = image.width * scale
    const displayHeight = image.height * scale

    const delta = e.deltaY > 0 ? -0.1 : 0.1
    let newWidth = cropArea.width * (1 + delta)
    let newHeight = newWidth / aspectRatio

    // Constrain size
    const minWidth = 100
    const maxWidth = displayWidth
    const maxHeight = displayHeight

    if (newWidth < minWidth) {
      newWidth = minWidth
      newHeight = newWidth / aspectRatio
    }

    if (newWidth > maxWidth || newHeight > maxHeight) {
      if (maxWidth / aspectRatio <= maxHeight) {
        newWidth = maxWidth
        newHeight = newWidth / aspectRatio
      } else {
        newHeight = maxHeight
        newWidth = newHeight * aspectRatio
      }
    }

    // Adjust position to keep crop area centered during resize
    let newX = cropArea.x - (newWidth - cropArea.width) / 2
    let newY = cropArea.y - (newHeight - cropArea.height) / 2

    // Constrain position
    newX = Math.max(0, Math.min(newX, displayWidth - newWidth))
    newY = Math.max(0, Math.min(newY, displayHeight - newHeight))

    setCropArea({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const container = containerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Calculate scale to fit image in container
    const scale = Math.min(
      containerWidth / image.width,
      containerHeight / image.height
    )

    const displayWidth = image.width * scale
    const displayHeight = image.height * scale

    canvas.width = displayWidth
    canvas.height = displayHeight

    // Draw image
    ctx.drawImage(image, 0, 0, displayWidth, displayHeight)

    // Draw overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, displayWidth, displayHeight)

    // Clear crop area
    ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)

    // Draw image in crop area
    ctx.drawImage(
      image,
      cropArea.x / scale,
      cropArea.y / scale,
      cropArea.width / scale,
      cropArea.height / scale,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height
    )

    // Draw crop area border
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 2
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)

    // Draw corner handles
    const handleSize = 10
    ctx.fillStyle = '#3B82F6'
    const corners = [
      { x: cropArea.x, y: cropArea.y },
      { x: cropArea.x + cropArea.width, y: cropArea.y },
      { x: cropArea.x, y: cropArea.y + cropArea.height },
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
    ]
    corners.forEach(corner => {
      ctx.fillRect(
        corner.x - handleSize / 2,
        corner.y - handleSize / 2,
        handleSize,
        handleSize
      )
    })
  }, [image, cropArea])

  const handleCrop = async () => {
    if (!image || !canvasRef.current) return

    setProcessing(true)
    try {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const scale = Math.min(
        containerWidth / image.width,
        containerHeight / image.height
      )

      // Calculate crop area in original image coordinates
      const cropX = cropArea.x / scale
      const cropY = cropArea.y / scale
      const cropWidth = cropArea.width / scale
      const cropHeight = cropArea.height / scale

      // Create a new canvas for the cropped image
      const croppedCanvas = document.createElement('canvas')
      croppedCanvas.width = cropWidth
      croppedCanvas.height = cropHeight
      const croppedCtx = croppedCanvas.getContext('2d')

      if (!croppedCtx) return

      // Draw the cropped portion
      croppedCtx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      )

      // Convert to base64
      const croppedImageUrl = croppedCanvas.toDataURL('image/jpeg', 0.95)
      onCropComplete(croppedImageUrl)
      onClose()
    } catch (error) {
      console.error('Error cropping image:', error)
      alert('Wystąpił błąd podczas kadrowania zdjęcia')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Kadruj zdjęcie</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div
            ref={containerRef}
            className="relative w-full h-[500px] bg-muted rounded-lg overflow-hidden"
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              className="cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Przeciągnij aby przesunąć • Użyj kółka myszy aby powiększyć/pomniejszyć
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
            Anuluj
          </Button>
          <Button onClick={handleCrop} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Przetwarzanie...
              </>
            ) : (
              'Zatwierdź'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
