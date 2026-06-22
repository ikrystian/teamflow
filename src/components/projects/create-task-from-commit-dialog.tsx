"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { GitCommitHorizontal, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function CreateTaskFromCommitDialog({
  projectId,
  onTaskCreated,
}: {
  projectId: string
  onTaskCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const commitUrl = url.trim()
    if (!commitUrl || loading) return

    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/from-commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitUrl }),
      })

      if (response.ok) {
        toast.success("Zadanie utworzone na podstawie commita")
        setUrl("")
        setOpen(false)
        onTaskCreated()
      } else {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || "Nie udało się utworzyć zadania z commita")
      }
    } catch (error) {
      console.error("Error creating task from commit:", error)
      toast.error("Wystąpił błąd podczas tworzenia zadania z commita")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GitCommitHorizontal className="mr-2 h-4 w-4" />
          Z commita
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Utwórz zadanie z commita</DialogTitle>
          <DialogDescription>
            Wklej URL commita z GitHuba. System przeanalizuje zmiany i utworzy zadanie
            tak samo, jak po otrzymaniu danych z GitHuba.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/commit/abc123..."
            autoFocus
            disabled={loading}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || !url.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analizowanie commita...
                </>
              ) : (
                "Utwórz zadanie"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
