"use client"

import { useEffect, useState } from "react"
import { Copy, ExternalLink, Share2, Trash } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type Project } from "@/types"

interface ShareProjectDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareProjectDialog({ project, open, onOpenChange }: ShareProjectDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [removing, setRemoving] = useState(false)

  const projectId = project?.id

  useEffect(() => {
    if (!open || !projectId) return

    let cancelled = false
    const loadShareSettings = async () => {
      setLoading(true)
      setShareUrl(null)
      try {
        const response = await fetch(`/api/projects/${projectId}/share`)
        if (response.ok && !cancelled) {
          const data = await response.json()
          setShareUrl(data.shareUrl)
        }
      } catch (error) {
        console.error("Error loading share settings:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadShareSettings()

    return () => {
      cancelled = true
    }
  }, [open, projectId])

  const generateShareLink = async () => {
    if (!projectId) return
    setGenerating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/share`, { method: "POST" })
      if (response.ok) {
        const data = await response.json()
        setShareUrl(data.shareUrl)
        toast.success("Link udostępniania został wygenerowany")
      } else {
        toast.error("Nie udało się wygenerować linku udostępniania")
      }
    } catch (error) {
      console.error("Error generating share link:", error)
      toast.error("Wystąpił błąd podczas generowania linku")
    } finally {
      setGenerating(false)
    }
  }

  const removeShareLink = async () => {
    if (!projectId) return
    setRemoving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/share`, { method: "DELETE" })
      if (response.ok) {
        setShareUrl(null)
        toast.success("Link udostępniania został usunięty")
      } else {
        toast.error("Nie udało się usunąć linku udostępniania")
      }
    } catch (error) {
      console.error("Error removing share link:", error)
      toast.error("Wystąpił błąd podczas usuwania linku")
    } finally {
      setRemoving(false)
    }
  }

  const copyShareLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link został skopiowany do schowka")
    } catch {
      toast.error("Nie udało się skopiować linku")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Udostępnij projekt {project?.name}</DialogTitle>
          <DialogDescription>
            Publiczny link pokazuje tablicę zadań tylko do odczytu, także osobom bez konta w systemie.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Ładowanie...</p>
        ) : shareUrl ? (
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <Button variant="outline" size="icon" onClick={copyShareLink} aria-label="Kopiuj link">
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
              aria-label="Otwórz link"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Projekt nie jest udostępniony.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {shareUrl ? (
            <>
              <Button variant="destructive" onClick={removeShareLink} disabled={removing || generating}>
                <Trash className="h-4 w-4 mr-2" />
                {removing ? "Usuwanie..." : "Usuń udostępnianie"}
              </Button>
              <Button variant="outline" onClick={generateShareLink} disabled={generating || removing}>
                <Share2 className="h-4 w-4 mr-2" />
                {generating ? "Generowanie..." : "Wygeneruj nowy link"}
              </Button>
            </>
          ) : (
            <Button onClick={generateShareLink} disabled={loading || generating}>
              <Share2 className="h-4 w-4 mr-2" />
              {generating ? "Generowanie..." : "Wygeneruj link udostępniania"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
