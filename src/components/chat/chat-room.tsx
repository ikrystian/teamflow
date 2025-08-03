'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users, Hash } from 'lucide-react'
import { Message } from './message'
import { ChatInput } from './chat-input'
import { useSocket } from '@/components/providers/socket-provider'

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
  chatRoomId: string
}

interface Project {
  id: string
  name: string
  color: string
  icon: string | null
}

interface ChatRoomData {
  id: string
  name: string | null
  type: string
  createdAt: string
  project?: Project
  members: Array<{
    user: User
  }>
  messages: Array<MessageData>
}

interface ChatRoomProps {
  room: ChatRoomData
}

export function ChatRoom({ room }: ChatRoomProps) {
  const { data: session } = useSession()
  const { socket, isConnected } = useSocket()
  const [messages, setMessages] = useState<MessageData[]>([])
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (room.id) {
      fetchMessages()
      if (socket && isConnected) {
        socket.emit('join-room', room.id)
      }
    }

    return () => {
      if (socket && room.id) {
        socket.emit('leave-room', room.id)
      }
    }
  }, [room.id, socket, isConnected])

  useEffect(() => {
    if (socket && isConnected) {
      const handleNewMessage = (message: MessageData) => {
        if (message.chatRoomId === room.id) {
          setMessages(prev => {
            // Sprawdź czy wiadomość już nie istnieje (deduplikacja)
            const exists = prev.find(m => m.id === message.id)
            if (exists) {
              return prev
            }
            return [...prev, message]
          })
          scrollToBottom()
        }
      }

      const handleMessageSent = (message: MessageData) => {
        if (message.chatRoomId === room.id) {
          setMessages(prev => {
            // Sprawdź czy wiadomość już nie istnieje (deduplikacja)
            const exists = prev.find(m => m.id === message.id)
            if (exists) {
              return prev
            }
            return [...prev, message]
          })
          scrollToBottom()
        }
      }

      const handleUserTyping = (data: { userId: string; userName: string; chatRoomId: string }) => {
        if (data.chatRoomId === room.id && data.userId !== session?.user?.id) {
          setTypingUsers(prev => {
            const existing = prev.find(u => u.userId === data.userId)
            if (!existing) {
              return [...prev, { userId: data.userId, userName: data.userName }]
            }
            return prev
          })
        }
      }

      const handleUserStopTyping = (data: { userId: string; chatRoomId: string }) => {
        if (data.chatRoomId === room.id) {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId))
        }
      }

      socket.on('new-message', handleNewMessage)
      socket.on('message-sent', handleMessageSent)
      socket.on('user-typing', handleUserTyping)
      socket.on('user-stop-typing', handleUserStopTyping)

      return () => {
        socket.off('new-message', handleNewMessage)
        socket.off('message-sent', handleMessageSent)
        socket.off('user-typing', handleUserTyping)
        socket.off('user-stop-typing', handleUserStopTyping)
      }
    }
  }, [socket, isConnected, room.id, session?.user?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chat/rooms/${room.id}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }

  const handleSendMessage = async (content: string) => {
    try {
      const response = await fetch(`/api/chat/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (response.ok) {
        const message = await response.json()

        // Dodaj wiadomość lokalnie od razu (optimistic update)
        setMessages(prev => {
          // Sprawdź czy wiadomość już nie istnieje (deduplikacja)
          const exists = prev.find(m => m.id === message.id)
          if (exists) {
            return prev
          }
          return [...prev, message]
        })
        scrollToBottom()

        // Wyślij przez socket do innych użytkowników
        if (socket) {
          socket.emit('send-message', {
            ...message,
            chatRoomId: room.id
          })
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleTyping = () => {
    if (socket && session?.user) {
      socket.emit('typing', {
        chatRoomId: room.id,
        userId: session.user.id,
        userName: session.user.name || session.user.email
      })

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', {
          chatRoomId: room.id,
          userId: session.user.id
        })
      }, 2000)
    }
  }

  const getRoomDisplayName = () => {
    if (room.type === 'direct') {
      const otherUser = room.members.find(m => m.user.id !== session?.user?.id)
      return otherUser?.user.name || otherUser?.user.email || 'Unknown User'
    }
    if (room.type === 'project' && room.project) {
      return room.project.name
    }
    return room.name || 'Group Chat'
  }

  const getRoomAvatar = () => {
    if (room.type === 'direct') {
      const otherUser = room.members.find(m => m.user.id !== session?.user?.id)
      return otherUser?.user.avatarUrl
    }
    return null
  }

  const getRoomIcon = () => {
    if (room.type === 'project' && room.project?.icon) {
      return room.project.icon
    }
    return null
  }

  return (
    <div className="h-full rounded-none border-0 flex flex-col">
      <div className="pb-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={getRoomAvatar() || undefined} />
            <AvatarFallback style={{ backgroundColor: room.type === 'project' && room.project?.color ? room.project.color : undefined }}>
              {room.type === 'direct' ? (
                getRoomDisplayName().charAt(0)
              ) : room.type === 'project' && getRoomIcon() ? (
                <span className="text-lg">{getRoomIcon()}</span>
              ) : (
                <Hash className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex justify-between flex-1">
            <div className="text-lg">{getRoomDisplayName()}</div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>{room.members.length} członków</span>
              {room.type === 'group' && (
                <Badge variant="secondary" className="ml-2">
                  Grupa
                </Badge>
              )}
              {room.type === 'project' && (
                <Badge variant="outline" className="ml-2">
                  Projekt
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const prevMessage = messages[index - 1]
                const showAvatar = !prevMessage ||
                  prevMessage.senderId !== message.senderId ||
                  new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000 // 5 minutes

                return (
                  <Message
                    key={message.id}
                    message={message}
                    showAvatar={showAvatar}
                    isOwn={message.senderId === session?.user?.id}
                  />
                )
              })}

              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500 px-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>
                    {typingUsers.length === 1
                      ? `${typingUsers[0].userName} pisze...`
                      : `${typingUsers.length} osoby piszą...`
                    }
                  </span>
                </div>
              )}

              {messages.length === 0 && !loading && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-lg mb-2">👋</div>
                  <p>Rozpocznij rozmowę!</p>
                  <p className="text-sm">Wyślij swoją pierwszą wiadomość do {getRoomDisplayName()}</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4">
          <ChatInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
        </div>
      </div>
    </div>
  )
}
