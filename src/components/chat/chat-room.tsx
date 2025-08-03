'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Hash, MessageCircle, Settings, Phone, Video } from 'lucide-react'
import { Message } from './message'
import { ChatInput } from './chat-input'
import { useSocket } from '@/components/providers/socket-provider'

interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

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
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const fetchMessages = useCallback(async () => {
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
  }, [room.id])

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
  }, [room.id, socket, isConnected, fetchMessages])

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
        if (data.chatRoomId === room.id && data.userId !== (session?.user as AuthUser)?.id) {
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
  }, [socket, isConnected, room.id, session?.user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])


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
      const currentUser = session.user as AuthUser;
      socket.emit('typing', {
        chatRoomId: room.id,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email
      })

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', {
          chatRoomId: room.id,
          userId: currentUser.id
        })
      }, 2000)
    }
  }

  const getRoomDisplayName = () => {
    if (room.type === 'direct') {
      const otherUser = room.members.find(m => m.user.id !== (session?.user as AuthUser)?.id)
      return otherUser?.user.name || otherUser?.user.email || 'Unknown User'
    }
    if (room.type === 'project' && room.project) {
      return room.project.name
    }
    return room.name || 'Group Chat'
  }

  const getRoomAvatar = () => {
    if (room.type === 'direct') {
      const otherUser = room.members.find(m => m.user.id !== (session?.user as AuthUser)?.id)
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
    <div className="h-full flex flex-col bg-background">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-background shadow-lg">
                <AvatarImage src={getRoomAvatar() || undefined} />
                <AvatarFallback
                  className="text-sm font-semibold"
                  style={{ backgroundColor: room.type === 'project' && room.project?.color ? room.project.color : undefined }}
                >
                  {room.type === 'direct' ? (
                    getRoomDisplayName().charAt(0).toUpperCase()
                  ) : room.type === 'project' && getRoomIcon() ? (
                    <span className="text-lg">{getRoomIcon()}</span>
                  ) : (
                    <Hash className="h-5 w-5" />
                  )}
                </AvatarFallback>
              </Avatar>
              {/* Online status indicator */}
              {room.type === 'direct' && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">{getRoomDisplayName()}</h3>
                {room.type === 'group' && (
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    Grupa
                  </Badge>
                )}
                {room.type === 'project' && (
                  <Badge variant="outline" className="gap-1">
                    <Hash className="h-3 w-3" />
                    Projekt
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{room.members.length} {room.members.length === 1 ? 'członek' : 'członków'}</span>
                </div>
                {room.type === 'direct' && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Online</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {room.type === 'direct' && (
              <>
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-green-100 hover:text-green-700">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-blue-100 hover:text-blue-700">
                  <Video className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Users className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/20">
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                      <div className="h-4 bg-muted rounded-lg w-3/4 p-3"></div>
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
                    isOwn={message.senderId === (session?.user as AuthUser)?.id}
                  />
                )
              })}

              {typingUsers.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-xs">
                      {typingUsers[0].userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {typingUsers.length === 1
                        ? `${typingUsers[0].userName} pisze...`
                        : `${typingUsers.length} osób pisze...`
                      }
                    </span>
                  </div>
                </div>
              )}

              {messages.length === 0 && !loading && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-primary/10 rounded-3xl flex items-center justify-center">
                    <MessageCircle className="h-10 w-10 text-primary/60" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2 text-foreground">Rozpocznij rozmowę!</h4>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Wyślij swoją pierwszą wiadomość do <span className="font-medium">{getRoomDisplayName()}</span> i rozpocznij komunikację.
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background/80 backdrop-blur-sm p-4">
          <ChatInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
        </div>
      </div>
    </div>
  )
}
