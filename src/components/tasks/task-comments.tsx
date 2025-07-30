"use client"

import { useState } from "react"

import { ClickableAvatar } from "@/components/ui/clickable-avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, MoreHorizontal, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Comment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    avatarUrl?: string
  }
}

interface TaskCommentsProps {
  taskId: string
  comments: Comment[]
  onCommentAdded: (comment: Comment) => void
  onCommentDeleted: (commentId: string) => void
}

export function TaskComments({
  taskId,
  comments,
  onCommentAdded,
  onCommentDeleted,
}: TaskCommentsProps) {
  const { data: session } = useSession()
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "Przed chwilą"
    } else if (diffInHours < 24) {
      return `${diffInHours} godz. temu`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) {
        return `${diffInDays} dni temu`
      } else {
        return date.toLocaleDateString()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newComment.trim()
        }),
      })

      if (!response.ok) {
        throw new Error("Nie udało się dodać komentarza")
      }

      const comment = await response.json()
      onCommentAdded(comment)
      setNewComment("")
    } catch (error) {
      console.error("Błąd podczas dodawania komentarza:", error)
      // You might want to show a toast notification here
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!commentToDelete) return

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/comments/${commentToDelete}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Nie udało się usunąć komentarza")
      }

      onCommentDeleted(commentToDelete)
    } catch (error) {
      console.error("Błąd podczas usuwania komentarza:", error)
      // You might want to show a toast notification here
    } finally {
      setShowDeleteConfirm(false)
      setCommentToDelete(null)
    }
  }

  const openDeleteConfirm = (commentId: string) => {
    setCommentToDelete(commentId)
    setShowDeleteConfirm(true)
  }

  return (
    <div className="space-y-4">

      {/* Add new comment form */}
      {session?.user && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex space-x-3">
            <ClickableAvatar
              userId={(session.user as { id: string })?.id || ""}
              avatarUrl={session.user.image || undefined}
              name={session.user.name || "User"}
              size="sm"
            />
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Dodaj komentarz..."
                className="min-h-[80px] resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || isSubmitting}
              className="flex items-center space-x-2"
            >
              <Send className="h-3 w-3" />
              <span>{isSubmitting ? "Dodawanie..." : "Dodaj komentarz"}</span>
            </Button>
          </div>
        </form>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Brak komentarzy. Bądź pierwszym, który skomentuje!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3 group">
              <ClickableAvatar
                userId={comment.author.id}
                avatarUrl={comment.author.avatarUrl}
                name={comment.author.name}
                size="md"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{comment.author.name}</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  {(session?.user as { id: string })?.id === comment.author.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => openDeleteConfirm(comment.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten komentarz?</AlertDialogTitle>
            <AlertDialogDescription>
              Tej operacji nie można cofnąć. Komentarz zostanie trwale usunięty.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
