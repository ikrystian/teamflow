"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Loader2,
  Shuffle
} from "lucide-react"
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ProjectImageSelectorProps {
  selectedImageUrl?: string | null
  onImageChange?: (imageUrl: string | null) => void
  className?: string
}

export function ProjectImageSelector({ 
  selectedImageUrl,
  onImageChange,
  className
}: ProjectImageSelectorProps) {
  const [uploading, setUploading] = useState(false)
  const [fetchingRandom, setFetchingRandom] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Plik musi być obrazem"
    }
    if (file.size > 10 * 1024 * 1024) {
      return "Rozmiar pliku nie może przekraczać 10MB"
    }
    return null
  }

  const handleFileSelect = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      alert(error)
      return
    }

    setUploading(true)
    try {
      // Convert file to base64 for preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onImageChange?.(result)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error processing file:', error)
      alert('Wystąpił błąd podczas przetwarzania pliku')
    } finally {
      setUploading(false)
    }
  }

  const handleRandomImage = async () => {
    setFetchingRandom(true)
    try {
      const response = await fetch('/api/projects/random-image?query=business office workspace')
      if (response.ok) {
        const data = await response.json()
        onImageChange?.(data.url)
      } else {
        alert('Nie udało się pobrać losowego zdjęcia')
      }
    } catch (error) {
      console.error('Error fetching random image:', error)
      alert('Wystąpił błąd podczas pobierania losowego zdjęcia')
    } finally {
      setFetchingRandom(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemoveImage = () => {
    onImageChange?.(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Zdjęcie projektu</Label>
      
      {selectedImageUrl ? (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={selectedImageUrl}
                  alt="Podgląd zdjęcia projektu"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Zmień zdjęcie
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRandomImage}
                disabled={fetchingRandom}
              >
                {fetchingRandom ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4 mr-2" />
                )}
                Losowe zdjęcie
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            "hover:border-primary/50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Dodaj zdjęcie projektu</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Przeciągnij i upuść plik lub wybierz z komputera
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Wybierz plik
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRandomImage}
                disabled={fetchingRandom}
              >
                {fetchingRandom ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4 mr-2" />
                )}
                Losowe zdjęcie
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Maksymalny rozmiar: 10MB. Obsługiwane formaty: JPG, PNG, GIF
            </p>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  )
}
