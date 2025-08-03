'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface MessageData {
  id: string
  content: string
  createdAt: string
  senderId: string
  sender: User
}

interface MessageProps {
  message: MessageData
  showAvatar: boolean
  isOwn: boolean
}

export function Message({ message, showAvatar, isOwn }: MessageProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  }

  return (
    <div className={cn(
      "flex gap-3 group",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      <div className="flex-shrink-0">
        {showAvatar ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.sender.avatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {message.sender.name?.charAt(0) || message.sender.email.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 h-8" />
        )}
      </div>

      <div className={cn(
        "flex-1 max-w-xs sm:max-w-md",
        isOwn ? "items-end" : "items-start"
      )}>
        {showAvatar && (
          <div className={cn(
            "flex items-center gap-2 mb-1",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {message.sender.name || message.sender.email}
            </span>
            <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}

        <div className={cn(
          "rounded-lg px-3 py-2 text-sm break-words",
          isOwn
            ? "bg-blue-500 text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
        )}>
          {message.content}
        </div>

        {!showAvatar && (
          <div className={cn(
            "text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isOwn ? "text-right" : "text-left"
          )}>
            {formatTime(message.createdAt)}
          </div>
        )}
      </div>
    </div>
  )
}
