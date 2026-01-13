"use client"

import { useState, useRef, useEffect } from 'react'
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from 'react-image-crop'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropperProps {
  imageUrl: string
  open: boolean
  onClose: () => void
  onCropComplete: (croppedImageUrl: string) => void
  aspectRatio?: number
}

export function ImageCropper({
  imageUrl,
  open,
  onClose,
  onCropComplete,
  aspectRatio = 11 / 5 // Default 11:5 aspect ratio
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [processing, setProcessing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (open && imageUrl) {
      // Initialize crop when dialog opens
      const initialCrop = {
        unit: '%' as const,
        width: 80,
        height: (80 * aspectRatio) / (11 / 5), // Maintain aspect ratio
        x: 10,
        y: 10,
      }
      setCrop(initialCrop)
    }
  }, [open, imageUrl, aspectRatio])

  const centerAspectCrop = (
    mediaWidth: number,
    mediaHeight: number,
    aspect: number
  ) => {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    )
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const centeredCrop = centerAspectCrop(width, height, aspectRatio)
    setCrop(centeredCrop)
  }

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) return

    setProcessing(true)
    try {
      const image = imgRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      // Calculate scale factors between displayed and natural image size
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // Calculate actual crop coordinates on the original image
      const cropX = completedCrop.x * scaleX
      const cropY = completedCrop.y * scaleY
      const cropWidth = completedCrop.width * scaleX
      const cropHeight = completedCrop.height * scaleY

      // Set canvas size to the cropped area (using original image dimensions)
      canvas.width = cropWidth
      canvas.height = cropHeight

      // Draw the cropped image from original coordinates
      ctx.drawImage(
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
      const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.95)
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
          <div className="relative w-full h-[500px] flex items-center justify-center bg-muted rounded-lg overflow-hidden">
            {imageUrl && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                keepSelection
                className="max-w-full max-h-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Zdjęcie do kadrowania"
                  onLoad={onImageLoad}
                  crossOrigin="anonymous"
                  className="max-w-full max-h-full object-contain"
                />
              </ReactCrop>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Przeciągnij rogi aby dostosować kadrowanie • Proporcje: 11:5
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
            Anuluj
          </Button>
          <Button onClick={handleCrop} disabled={processing || !completedCrop}>
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

        {/* Hidden canvas for image processing */}
        <canvas
          ref={canvasRef}
          style={{
            display: 'none',
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
