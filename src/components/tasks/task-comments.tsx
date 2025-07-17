"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send } from "lucide-react"
import { useSession } from "next-auth/react"

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
}

export function TaskComments({ taskId, comments, onCommentAdded }: TaskCommentsProps) {
  const { data: session } = useSession()
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) {
        return `${diffInDays}d ago`
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
        throw new Error("Failed to add comment")
      }

      const comment = await response.json()
      onCommentAdded(comment)
      setNewComment("")
    } catch (error) {
      console.error("Error adding comment:", error)
      // You might want to show a toast notification here
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900 flex items-center">
        <MessageSquare className="h-4 w-4 mr-2" />
        Comments ({comments.length})
      </h4>

      {/* Add new comment form */}
      {session?.user && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback className="text-xs">
                {session.user.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
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
              <span>{isSubmitting ? "Adding..." : "Add Comment"}</span>
            </Button>
          </div>
        </form>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.author.avatarUrl} />
                <AvatarFallback className="text-xs">
                  {comment.author.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{comment.author.name}</span>
                  <span className="text-xs text-gray-500">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
