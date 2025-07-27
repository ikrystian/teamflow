"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Camera,
  Upload,
  Loader2,
  Trash2
} from "lucide-react"
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  fallbackText?: string
  onAvatarChange?: (avatarUrl: string | null) => void
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  editable?: boolean
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-20 w-20",
  xl: "h-32 w-32"
}

const fallbackSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
  xl: "text-2xl"
}

export function AvatarUpload({
  currentAvatarUrl,
  fallbackText = "U",
  onAvatarChange,
  className,
  size = "lg",
  editable = true
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Plik musi być obrazem"
    }
    if (file.size > 5 * 1024 * 1024) {
      return "Rozmiar pliku nie może przekraczać 5MB"
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
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        onAvatarChange?.(result.avatarUrl)
        setIsDialogOpen(false)
      } else {
        const error = await response.json()
        alert(`Błąd: ${error.error || 'Nie udało się przesłać zdjęcia'}`)
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Wystąpił błąd podczas przesyłania zdjęcia')
    } finally {
      setUploading(false)
      setPreviewUrl(null)
    }
  }

  const handleRemoveAvatar = async () => {
    setUploading(true)
    try {
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
      })

      if (response.ok) {
        onAvatarChange?.(null)
        setIsDialogOpen(false)
      } else {
        const error = await response.json()
        alert(`Błąd: ${error.error || 'Nie udało się usunąć zdjęcia'}`)
      }
    } catch (error) {
      console.error('Error removing avatar:', error)
      alert('Wystąpił błąd podczas usuwania zdjęcia')
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      handleFileSelect(file)
    }
    // Reset input
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      handleFileSelect(file)
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

  if (!editable) {
    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={currentAvatarUrl || ""} />
        <AvatarFallback className={fallbackSizeClasses[size]}>
          {fallbackText}
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={previewUrl || currentAvatarUrl || ""} />
        <AvatarFallback className={fallbackSizeClasses[size]}>
          {fallbackText}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Zmień zdjęcie
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Zmień zdjęcie profilowe</DialogTitle>
              <DialogDescription>
                Prześlij nowe zdjęcie profilowe. Maksymalny rozmiar: 5MB.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Current/Preview Avatar */}
              <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={previewUrl || currentAvatarUrl || ""} />
                  <AvatarFallback className="text-xl">
                    {fallbackText}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                  dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  uploading && "opacity-50 pointer-events-none"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="hidden"
                  disabled={uploading}
                />

                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Przesyłanie...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Przeciągnij zdjęcie tutaj lub kliknij aby wybrać
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF do 5MB
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-2">
                {currentAvatarUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Usuń zdjęcie
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={uploading}
                >
                  Anuluj
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <p className="text-sm text-gray-500">
          JPG, PNG lub GIF. Maksymalnie 5MB.
        </p>
      </div>
    </div>
  )
}
