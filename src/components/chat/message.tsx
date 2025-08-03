'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CheckCheck } from 'lucide-react'
// import { formatDistanceToNow } from 'date-fns' // This line was removed

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


  const formatShortTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={cn(
      "flex gap-4 group transition-colors duration-200 rounded-lg p-1 mb-0",
      isOwn ? "flex-row-reverse" : "flex-row",
      showAvatar ? 'mt-4' : ''
    )}>
      <div className="flex-shrink-0">
        {showAvatar ? (
          <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
            <AvatarImage src={message.sender.avatarUrl || undefined} />
            <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-primary/20 to-primary/10">
              {(message.sender.name?.charAt(0) || message.sender.email.charAt(0)).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      <div className={cn(
        "flex-1 max-w-sm lg:max-w-lg xl:max-w-2xl",
        isOwn ? "items-end" : "items-start"
      )}>
        {showAvatar && (
          <div className={cn(
            "flex items-center gap-3 mb-2",
            isOwn ? "flex-row-reverse justify-end" : "flex-row justify-start"
          )}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {message.sender.name || message.sender.email.split('@')[0]}
              </span>
              {/* You could add status badges here like "Admin", "Online" etc */}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  {formatShortTime(message.createdAt)}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {new Date(message.createdAt).toLocaleDateString('pl-PL', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString('pl-PL')}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className={cn(
          "relative group/message rounded-2xl px-4 py-3 text-sm border",
          isOwn
            ? "bg-primary text-primary-foreground border-primary/20 rounded-br-md ml-8"
            : "bg-card text-card-foreground border-border rounded-bl-md mr-8"
        )}>
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>

          {/* Message status indicators for own messages */}
          {isOwn && (
            <div className="absolute -bottom-1 -right-1 opacity-0 group-hover/message:opacity-100 transition-opacity">
              <div className="bg-background rounded-full p-1 px-2 shadow-sm border">
            <Popover>
              <PopoverTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  {formatShortTime(message.createdAt)}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {new Date(message.createdAt).toLocaleDateString('pl-PL', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString('pl-PL')}
                  </p>
                </div>
              </PopoverContent>
            </Popover>              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
