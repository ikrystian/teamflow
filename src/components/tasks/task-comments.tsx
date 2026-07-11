"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import TextareaAutosize from "react-textarea-autosize"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ClickableAvatar } from "@/components/ui/clickable-avatar"
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface TaskComment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string | null
    avatarUrl?: string | null
  }
}

interface TaskCommentsProps {
  taskId: string
  readOnly?: boolean
  /** Wywoływane po dodaniu/usunięciu komentarza, żeby odświeżyć licznik na karcie. */
  onCommentsChanged?: () => void
}

// Sekcja komentarzy zadania: lista + dodawanie + usuwanie własnych komentarzy.
export function TaskComments({ taskId, readOnly = false, onCommentsChanged }: TaskCommentsProps) {
  const { data: session } = useSession() as { data: Session | null }
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || data || [])
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleAddComment = async () => {
    const content = newComment.trim()
    if (!content || submitting) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (response.ok) {
        const comment = await response.json()
        setComments(prev => [comment, ...prev])
        setNewComment("")
        onCommentsChanged?.()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się dodać komentarza")
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      toast.error("Nie udało się dodać komentarza")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        onCommentsChanged?.()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się usunąć komentarza")
      }
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast.error("Nie udało się usunąć komentarza")
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <MessageSquare className="h-4 w-4" />
        Komentarze {comments.length > 0 && `(${comments.length})`}
      </Label>

      {!readOnly && (
        <div className="flex items-start gap-2">
          <TextareaAutosize
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleAddComment()
              }
            }}
            placeholder="Dodaj komentarz... (Ctrl+Enter aby wysłać)"
            minRows={2}
            className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddComment}
            disabled={submitting || !newComment.trim()}
            title="Dodaj komentarz"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Wczytywanie komentarzy...
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-1">Brak komentarzy.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5 group">
              <ClickableAvatar
                userId={comment.author.id}
                avatarUrl={comment.author.avatarUrl}
                name={comment.author.name}
                size="sm"
              />
              <div className="flex-1 min-w-0 bg-muted/40 border rounded-md px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {comment.author.name || "Użytkownik"}
                    </span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  {!readOnly && comment.author.id === session?.user?.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                      title="Usuń komentarz"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
