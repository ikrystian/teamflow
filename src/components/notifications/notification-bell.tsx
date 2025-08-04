'use client'

import { useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ScrollArea,
} from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { toast } from 'sonner'

interface ChatNotification {
  id: string
  chatRoomId: string
  chatRoomName: string | null
  chatRoomType: string
  senderId: string
  senderName: string | null
  senderAvatar: string | null
  content: string
  createdAt: string
  unreadCount: number
}

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const {
    notifications,
    totalUnread,
    isLoading,
    markAsRead,
    markAllAsRead
  } = useNotifications()
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    requestPermission,
    subscribe: subscribePush
  } = usePushNotifications()
  const [isOpen, setIsOpen] = useState(false)



  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Teraz'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    return `${Math.floor(diffInMinutes / 1440)}d`
  }

  const getChatRoomDisplayName = (notification: ChatNotification) => {
    if (notification.chatRoomType === 'direct') {
      return notification.senderName || 'Użytkownik'
    }
    return notification.chatRoomName || 'Czat grupowy'
  }

  const navigateToChat = async (chatRoomId: string) => {
    // Mark as read when navigating
    await markAsRead(chatRoomId)
    setIsOpen(false)

    // Navigate to chat with specific room
    window.location.href = `/dashboard/chat?room=${chatRoomId}`
  }

  const handleEnablePushNotifications = async () => {
    if (!pushSupported) {
      toast.error("Twoja przeglądarka nie obsługuje powiadomień push")
      return
    }

    if (pushPermission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        toast.error("Musisz zezwolić na powiadomienia, aby otrzymywać powiadomienia push")
        return
      }
    }

    if (!pushSubscribed) {
      const subscription = await subscribePush()
      if (subscription) {
        toast.success("Powiadomienia push zostały włączone! Będziesz otrzymywać powiadomienia o nowych wiadomościach.")
      } else {
        toast.error("Nie udało się skonfigurować powiadomień push")
      }
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative h-9 w-9 rounded-full",
            className
          )}
        >
          {totalUnread > 0 ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Powiadomienia</h4>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Oznacz wszystkie jako przeczytane
            </Button>
          )}
        </div>

        {/* Push notifications prompt */}
        {pushSupported && !pushSubscribed && (
          <div className="p-4 border-b bg-muted/30">
            <div className="text-sm text-muted-foreground mb-2">
              Włącz powiadomienia push, aby otrzymywać powiadomienia o nowych wiadomościach gdy aplikacja nie jest aktywna.
            </div>
            <Button
              size="sm"
              onClick={handleEnablePushNotifications}
              disabled={pushLoading}
              className="w-full"
            >
              {pushLoading ? "Włączanie..." : "Włącz powiadomienia push"}
            </Button>
          </div>
        )}

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Ładowanie...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Brak nowych powiadomień
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigateToChat(notification.chatRoomId)}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={notification.senderAvatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {(notification.senderName?.charAt(0) || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {getChatRoomDisplayName(notification)}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {notification.content}
                    </p>
                    {notification.unreadCount > 1 && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        +{notification.unreadCount - 1} więcej
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
