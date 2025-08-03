'use client'

import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string | null
  email: string
}

interface MessageContentProps {
  content: string
  users: User[]
  currentUserId?: string
  className?: string
}

export function MessageContent({ content, users, currentUserId, className }: MessageContentProps) {
  // Parse mentions in the content
  const parseMentions = (text: string) => {
    // Regex to match @[userId] pattern
    const mentionRegex = /@\[([^\]]+)\]/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        })
      }

      // Find user by ID
      const userId = match[1]
      const user = users.find(u => u.id === userId)

      parts.push({
        type: 'mention',
        content: match[0],
        userId,
        user,
        isCurrentUser: userId === currentUserId
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      })
    }

    return parts
  }

  const parts = parseMentions(content)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          const displayName = part.user?.name || part.user?.email?.split('@')[0] || 'Nieznany użytkownik'

          return (
            <span
              key={index}
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                part.isCurrentUser
                  ? "bg-primary text-primary border border-primary/30"
                  : "bg-white-100 text-primary border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
              )}
              title={part.user?.email}
            >
              @{displayName}
            </span>
          )
        }

        return (
          <span key={index} className="whitespace-pre-wrap break-words">
            {part.content}
          </span>
        )
      })}
    </span>
  )
}
