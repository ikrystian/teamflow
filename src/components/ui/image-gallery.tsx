"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, Upload, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface TaskImage {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
}

interface ImageGalleryProps {
  images: TaskImage[]
  onImageUpload?: (file: File) => Promise<void>
  onImageDelete?: (imageId: string) => Promise<void>
  editable?: boolean
}

export function ImageGallery({ 
  images, 
  onImageUpload, 
  onImageDelete, 
  editable = false 
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<TaskImage | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImageUpload) return

    setUploading(true)
    try {
      await onImageUpload(file)
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleImageDelete = async (imageId: string) => {
    if (!onImageDelete) return
    try {
      await onImageDelete(imageId)
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  if (images.length === 0 && !editable) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Images ({images.length})</h4>
        {editable && onImageUpload && (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Add Image'}
            </Button>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={image.url}
                      alt={image.filename}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{image.filename}</DialogTitle>
                  </DialogHeader>
                  <div className="relative">
                    <Image
                      src={image.url}
                      alt={image.filename}
                      width={800}
                      height={600}
                      className="w-full h-auto max-h-[80vh] object-contain"
                    />
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p className="font-medium">{image.filename}</p>
                      <p>{(image.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {editable && onImageDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleImageDelete(image.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
