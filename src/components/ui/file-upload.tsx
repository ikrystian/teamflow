"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  X,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  Presentation,
  Download,
  Eye
} from "lucide-react"
import { cn } from '@/lib/utils'
import { ImageLightbox } from '@/components/ui/image-lightbox'

interface UploadedFile {
  id: string
  filename: string
  originalName?: string
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  categories = ["specification", "design", "manual", "other"],
  showCategories = true,
  showDescriptions = true,
  className
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lightbox do powiększania obrazków — nawiguje po wszystkich obrazkach z listy.
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const imageFiles = files.filter(f => f.mimeType.startsWith('image/') && f.url)

  const openLightbox = (file: UploadedFile) => {
    const index = imageFiles.findIndex(f => f.id === file.id)
    if (index === -1) return
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  // Rozpoznaje typ dokumentu po mimeType z fallbackiem na rozszerzenie nazwy
  // pliku (przeglądarki nie zawsze podają mimeType, np. dla .md czy .csv).
  const getFileTypeInfo = (mimeType: string, filename?: string) => {
    const mime = mimeType || ''
    const ext = filename?.split('.').pop()?.toLowerCase() ?? ''

    if (mime.includes('pdf') || ext === 'pdf')
      return { label: 'PDF', icon: FileText, iconColor: 'text-red-500', badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' }
    if (mime.includes('msword') || mime.includes('wordprocessingml') || ['doc', 'docx', 'odt', 'rtf'].includes(ext))
      return { label: 'Word', icon: FileText, iconColor: 'text-blue-500', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' }
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv') || ['xls', 'xlsx', 'ods', 'csv'].includes(ext))
      return { label: 'Arkusz', icon: FileSpreadsheet, iconColor: 'text-green-600', badgeColor: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' }
    if (mime.includes('presentation') || mime.includes('powerpoint') || ['ppt', 'pptx', 'odp'].includes(ext))
      return { label: 'Prezentacja', icon: Presentation, iconColor: 'text-orange-500', badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' }
    if (mime.startsWith('image/'))
      return { label: 'Obraz', icon: FileImage, iconColor: 'text-purple-500', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' }
    if (mime.startsWith('video/'))
      return { label: 'Wideo', icon: FileVideo, iconColor: 'text-pink-500', badgeColor: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300' }
    if (mime.startsWith('audio/'))
      return { label: 'Audio', icon: FileAudio, iconColor: 'text-cyan-600', badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' }
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('tar') || mime.includes('gzip') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
      return { label: 'Archiwum', icon: FileArchive, iconColor: 'text-amber-600', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' }
    if (mime.includes('json') || mime.includes('xml') || mime.includes('javascript') || mime.includes('html') || mime.includes('css') || ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'php', 'rb', 'go', 'rs', 'sql', 'sh', 'yml', 'yaml', 'json', 'xml', 'html', 'css'].includes(ext))
      return { label: 'Kod', icon: FileCode, iconColor: 'text-indigo-500', badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' }
    if (mime.startsWith('text/') || ['txt', 'md'].includes(ext))
      return { label: 'Tekst', icon: FileText, iconColor: 'text-slate-500', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' }
    return { label: 'Plik', icon: File, iconColor: 'text-muted-foreground', badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
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
      case 'specification': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
      case 'design': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
      case 'manual': return 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
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
            const displayName = file.originalName || file.filename
            const typeInfo = getFileTypeInfo(file.mimeType, displayName)
            const FileIcon = typeInfo.icon
            const isImage = file.mimeType.startsWith('image/')
            return (
              <Card key={file.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {isImage && file.url ? (
                      <button
                        type="button"
                        onClick={() => openLightbox(file)}
                        className="flex-shrink-0 cursor-zoom-in"
                        title="Powiększ"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={file.url}
                          alt={displayName}
                          className="h-10 w-10 rounded object-cover border"
                        />
                      </button>
                    ) : (
                      <FileIcon className={cn("h-5 w-5 flex-shrink-0", typeInfo.iconColor)} />
                    )}
                    <div className="flex-1 min-w-0">
                      {file.url && isImage ? (
                        <button
                          type="button"
                          onClick={() => openLightbox(file)}
                          className="text-sm font-medium truncate block hover:underline text-left w-full cursor-zoom-in"
                          title="Powiększ"
                        >
                          {displayName}
                        </button>
                      ) : file.url ? (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium truncate block hover:underline"
                          title="Otwórz w nowej karcie"
                        >
                          {displayName}
                        </a>
                      ) : (
                        <p className="text-sm font-medium truncate">{displayName}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={cn("text-[10px] px-1.5 py-0", typeInfo.badgeColor)} variant="secondary">
                          {typeInfo.label}
                        </Badge>
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

      <ImageLightbox
        images={imageFiles.map(f => ({ url: f.url, name: f.originalName || f.filename }))}
        index={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onIndexChange={setLightboxIndex}
      />
    </div>
  )
}
