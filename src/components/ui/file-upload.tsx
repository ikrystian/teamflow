"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  X, 
  File, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio,
  Download,
  Eye
} from "lucide-react"
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
  description?: string
  category?: string
  createdAt?: string
}

interface FileUploadProps {
  files: UploadedFile[]
  onFileUpload?: (file: File, description?: string, category?: string) => Promise<void>
  onFileDelete?: (fileId: string) => Promise<void>
  onFileView?: (file: UploadedFile) => void
  onFileDownload?: (file: UploadedFile) => void
  editable?: boolean
  accept?: string
  maxSize?: number // in bytes
  maxFiles?: number
  title?: string
  description?: string
  categories?: string[]
  showCategories?: boolean
  showDescriptions?: boolean
  className?: string
}

export function FileUpload({ 
  files,
  onFileUpload,
  onFileDelete,
  onFileView,
  onFileDownload,
  editable = false,
  accept = "*/*",
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  title = "Pliki",
  description = "Załączone pliki",
  categories = ["specification", "design", "manual", "other"],
  showCategories = true,
  showDescriptions = true,
  className
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage
    if (mimeType.startsWith('video/')) return FileVideo
    if (mimeType.startsWith('audio/')) return FileAudio
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'specification': return 'bg-blue-100 text-blue-800'
      case 'design': return 'bg-purple-100 text-purple-800'
      case 'manual': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'specification': return 'Specyfikacja'
      case 'design': return 'Projekt'
      case 'manual': return 'Instrukcja'
      default: return 'Inne'
    }
  }

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `Plik jest za duży. Maksymalny rozmiar: ${formatFileSize(maxSize)}`
    }
    
    if (files.length >= maxFiles) {
      return `Osiągnięto maksymalną liczbę plików: ${maxFiles}`
    }

    return null
  }

  const handleFileSelect = async (selectedFiles: FileList) => {
    if (!onFileUpload) return

    setUploading(true)
    try {
      for (const file of Array.from(selectedFiles)) {
        const error = validateFile(file)
        if (error) {
          console.error(error)
          continue
        }

        await onFileUpload(file)
      }
    } catch (error) {
      console.error('Error uploading files:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      handleFileSelect(files)
    }
    // Reset input
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files) {
      handleFileSelect(files)
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

  const handleFileDelete = async (fileId: string) => {
    if (!onFileDelete) return
    try {
      await onFileDelete(fileId)
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">{title} ({files.length})</h4>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {editable && onFileUpload && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple
              onChange={handleInputChange}
              className="hidden"
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || files.length >= maxFiles}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Przesyłanie...' : 'Dodaj pliki'}
            </Button>
          </div>
        )}
      </div>

      {/* Drag and drop area */}
      {editable && onFileUpload && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            uploading && "opacity-50 pointer-events-none"
          )}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Przeciągnij pliki tutaj lub kliknij przycisk powyżej
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Maksymalny rozmiar: {formatFileSize(maxSize)}
          </p>
        </div>
      )}

      {/* Files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.mimeType)
            return (
              <Card key={file.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.filename}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                        {showCategories && file.category && (
                          <Badge className={getCategoryColor(file.category)} variant="secondary">
                            {getCategoryLabel(file.category)}
                          </Badge>
                        )}
                      </div>
                      {showDescriptions && file.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {file.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {onFileView && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onFileView(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onFileDownload && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onFileDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {editable && onFileDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileDelete(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {files.length === 0 && !editable && (
        <div className="text-center py-6 text-muted-foreground">
          <File className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Brak załączonych plików</p>
        </div>
      )}
    </div>
  )
}
