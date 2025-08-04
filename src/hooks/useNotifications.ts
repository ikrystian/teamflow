'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSocket } from '@/components/providers/socket-provider'

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

interface NotificationState {
  notifications: ChatNotification[]
  totalUnread: number
  isLoading: boolean
  error: string | null
}

interface UseNotificationsReturn extends NotificationState {
  fetchNotifications: () => Promise<void>
  markAsRead: (chatRoomId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  clearError: () => void
}

export function useNotifications(): UseNotificationsReturn {
  const { data: session } = useSession()
  const { socket, isConnected } = useSocket()

  const [state, setState] = useState<NotificationState>({
    notifications: [],
    totalUnread: 0,
    isLoading: false,
    error: null
  })

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!(session?.user as { id: string })?.id) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/notifications/chat')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      setState(prev => ({
        ...prev,
        notifications: data.notifications || [],
        totalUnread: data.totalUnread || 0,
        isLoading: false
      }))
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setState(prev => ({
        ...prev,
        error: 'Nie udało się pobrać powiadomień',
        isLoading: false
      }))
    }
  }, [(session?.user as { id: string })?.id])

  // Mark specific chat room as read
  const markAsRead = useCallback(async (chatRoomId: string) => {
    try {
      const response = await fetch(`/api/notifications/chat/${chatRoomId}/read`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setState(prev => {
        const notification = prev.notifications.find(n => n.chatRoomId === chatRoomId)
        const unreadToSubtract = notification?.unreadCount || 0

        return {
          ...prev,
          notifications: prev.notifications.filter(n => n.chatRoomId !== chatRoomId),
          totalUnread: Math.max(0, prev.totalUnread - unreadToSubtract)
        }
      })
    } catch (error) {
      console.error('Error marking as read:', error)
      setState(prev => ({
        ...prev,
        error: 'Nie udało się oznaczyć jako przeczytane'
      }))
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/chat/read-all', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setState(prev => ({
        ...prev,
        notifications: [],
        totalUnread: 0
      }))
    } catch (error) {
      console.error('Error marking all as read:', error)
      setState(prev => ({
        ...prev,
        error: 'Nie udało się oznaczyć wszystkich jako przeczytane'
      }))
    }
  }, [])

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Update notification for specific room
  const updateNotificationForRoom = useCallback(async (chatRoomId: string) => {
    try {
      const response = await fetch(`/api/notifications/chat/${chatRoomId}`)

      if (!response.ok) {
        // Don't throw error for 404 - it just means no unread messages
        if (response.status === 404) {
          console.log(`No unread messages for room ${chatRoomId}`)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // If no notification (no unread messages), remove existing notification for this room
      if (!data.notification) {
        setState(prev => {
          const existingIndex = prev.notifications.findIndex(n => n.chatRoomId === chatRoomId)

          if (existingIndex >= 0) {
            const updated = [...prev.notifications]
            const oldUnreadCount = updated[existingIndex].unreadCount
            updated.splice(existingIndex, 1) // Remove notification

            return {
              ...prev,
              notifications: updated,
              totalUnread: Math.max(0, prev.totalUnread - oldUnreadCount)
            }
          }

          return prev // No change if notification didn't exist
        })
        return
      }

      setState(prev => {
        const existingIndex = prev.notifications.findIndex(n => n.chatRoomId === chatRoomId)

        if (existingIndex >= 0) {
          // Update existing notification
          const updated = [...prev.notifications]
          const oldUnreadCount = updated[existingIndex].unreadCount
          updated[existingIndex] = data.notification

          return {
            ...prev,
            notifications: updated,
            totalUnread: prev.totalUnread - oldUnreadCount + data.notification.unreadCount
          }
        } else {
          // Add new notification
          return {
            ...prev,
            notifications: [data.notification, ...prev.notifications],
            totalUnread: prev.totalUnread + data.notification.unreadCount
          }
        }
      })
    } catch (error) {
      console.error('Error updating notification for room:', error)
    }
  }, [])

  // Send push notification when page is not visible
  const sendPushNotification = useCallback(async (messageData: {
    sender?: { name?: string };
    content: string;
    chatRoomId: string;
    senderId: string
  }) => {
    try {
      await fetch('/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'chat_message',
          title: `Nowa wiadomość od ${messageData.sender?.name || 'Użytkownika'}`,
          body: messageData.content.length > 100
            ? messageData.content.substring(0, 100) + '...'
            : messageData.content,
          data: {
            chatRoomId: messageData.chatRoomId,
            senderId: messageData.senderId
          }
        })
      })
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    if ((session?.user as { id: string })?.id) {
      fetchNotifications()
    }
  }, [(session?.user as { id: string })?.id, fetchNotifications])

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected || !(session?.user as { id: string })?.id) return

    const handleNewMessage = (messageData: {
      senderId: string;
      chatRoomId: string;
      sender?: { name?: string };
      content: string
    }) => {
      // Only process if user is not the sender
      if (messageData.senderId !== (session?.user as { id: string })?.id) {
        const isPageVisible = !document.hidden

        if (isPageVisible) {
          // Update notification bell
          updateNotificationForRoom(messageData.chatRoomId)
        } else {
          // Send push notification if page is not visible
          sendPushNotification(messageData)
          // Also update notification for when user returns
          updateNotificationForRoom(messageData.chatRoomId)
        }
      }
    }

    const handleChatRoomCreated = () => {
      // Refresh notifications when new chat room is created
      fetchNotifications()
    }

    socket.on('new-message', handleNewMessage)
    socket.on('new-chat-room', handleChatRoomCreated)

    return () => {
      socket.off('new-message', handleNewMessage)
      socket.off('new-chat-room', handleChatRoomCreated)
    }
  }, [socket, isConnected, (session?.user as { id: string })?.id, updateNotificationForRoom, sendPushNotification, fetchNotifications])

  // Listen for page visibility changes to refresh notifications
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && (session?.user as { id: string })?.id) {
        // Refresh notifications when user returns to the page
        fetchNotifications()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchNotifications, (session?.user as { id: string })?.id])

  return {
    ...state,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearError
  }
}
