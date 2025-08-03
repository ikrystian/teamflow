'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm cursor-pointer">
                  <AvatarImage src={message.sender.avatarUrl || undefined} />
                  <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-primary/20 to-primary/10">
                    {(message.sender.name?.charAt(0) || message.sender.email.charAt(0)).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="left" align="start" className="max-w-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={message.sender.avatarUrl || undefined} />
                      <AvatarFallback>
                        {(message.sender.name?.charAt(0) || message.sender.email.charAt(0)).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {message.sender.name || 'Użytkownik'}
                      </p>
                      <p className="text-xs">
                        {message.sender.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-green-600">Online</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      <div className={cn(
        "flex-1 inline max-w-fit",
        isOwn ? "items-end" : "items-start"
      )}>


        <div className={cn(
          "relative group/message rounded-2xl px-3 py-2 text-sm border",
          isOwn
            ? "bg-primary text-primary-foreground border-primary/20  rounded-br-md rounded-tr-md ml-8"
            : "bg-card text-card-foreground border-border rounded-bl-md rounded-tl-md mr-8",
        )}>
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>

          {/* Hover timestamp */}
          <Popover>
            <PopoverTrigger asChild>
              <div className={cn(
                "absolute bottom-1 text-xs opacity-0 group-hover/message:opacity-100 transition-opacity duration-200 cursor-pointer -right-2 transform translate-x-full text-muted-foreground",
                isOwn
                  ? "right-auto  -left-2 transform -translate-x-full"
                  : ""
              )}>
                {formatShortTime(message.createdAt)}
              </div>
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

      </div>
    </div>
  )
}
