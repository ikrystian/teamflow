'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Plus, Users, Search, ArrowLeft } from 'lucide-react'
import { ChatRoom } from './chat-room'
import { useSocket } from '@/components/providers/socket-provider'
import { useIsMobile } from '@/hooks/use-media-query'

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

interface Project {
  id: string
  name: string
  color: string
  icon: string | null
}

interface MessageData {
  id: string
  content: string
  createdAt: string
  senderId: string
  chatRoomId: string
  sender: User
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
  messages: MessageData[]
}

export function Chat() {
  const { data: session } = useSession()
  const { socket, isConnected } = useSocket()
  const isMobile = useIsMobile()
  const [chatRooms, setChatRooms] = useState<ChatRoomData[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomData | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false)
  const [newChatType, setNewChatType] = useState<'direct' | 'group' | 'project'>('direct')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [groupName, setGroupName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roomSearchTerm, setRoomSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchChatRooms = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/rooms')
      if (response.ok) {
        const rooms = await response.json()
        setChatRooms(rooms)
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        const allUsers = data.users || data // Handle both { users: [...] } and [...] formats
        if (session?.user) {
          setUsers(allUsers.filter((user: User) => user.id !== (session.user as AuthUser).id))
        } else {
          setUsers(allUsers);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [session?.user])

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchChatRooms()
      fetchUsers()
      fetchProjects()
    }
  }, [session?.user, fetchChatRooms, fetchUsers, fetchProjects])

  // Auto-select last conversation on initial load
  useEffect(() => {
    if (chatRooms.length > 0 && !selectedRoom && !loading) {
      // Sort by last message timestamp and select the most recent
      const sortedRooms = [...chatRooms].sort((a, b) => {
        const aTime = a.messages[0]?.createdAt ? new Date(a.messages[0].createdAt).getTime() : 0
        const bTime = b.messages[0]?.createdAt ? new Date(b.messages[0].createdAt).getTime() : 0
        return bTime - aTime
      })

      if (sortedRooms.length > 0) {
        setSelectedRoom(sortedRooms[0])
      }
    }
  }, [chatRooms, selectedRoom, loading])

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('new-message', (message) => {
        setChatRooms(prev => prev.map(room => {
          if (room.id === message.chatRoomId) {
            return {
              ...room,
              messages: [message]
            }
          }
          return room
        }))
      })

      return () => {
        socket.off('new-message')
      }
    }
  }, [socket, isConnected])


  const createDirectMessage = async (userId: string) => {
    try {
      const response = await fetch('/api/chat/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        const room = await response.json()
        setChatRooms(prev => {
          const exists = prev.find(r => r.id === room.id)
          return exists ? prev : [room, ...prev]
        })
        setSelectedRoom(room)
        setIsNewChatDialogOpen(false)
      }
    } catch (error) {
      console.error('Error creating direct message:', error)
    }
  }

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return

    try {
      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          type: 'group',
          memberIds: selectedUsers
        })
      })

      if (response.ok) {
        const room = await response.json()
        setChatRooms(prev => [room, ...prev])
        setSelectedRoom(room)
        setIsNewChatDialogOpen(false)
        setGroupName('')
        setSelectedUsers([])
      }
    } catch (error) {
      console.error('Error creating group chat:', error)
    }
  }

  const createProjectChat = async () => {
    if (!selectedProject) return

    try {
      const response = await fetch('/api/chat/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject
        })
      })

      if (response.ok) {
        const room = await response.json()
        setChatRooms(prev => {
          const exists = prev.find(r => r.id === room.id)
          return exists ? prev : [room, ...prev]
        })
        setSelectedRoom(room)
        setIsNewChatDialogOpen(false)
        setSelectedProject('')
      }
    } catch (error) {
      console.error('Error creating project chat:', error)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoomDisplayName = useCallback((room: ChatRoomData) => {
    if (room.type === 'direct') {
      const otherUser = room.members.find(m => m.user.id !== (session?.user as AuthUser)?.id)
      return otherUser?.user.name || otherUser?.user.email || 'Unknown User'
    }
    if (room.type === 'project' && room.project) {
      return room.project.name
    }
    return room.name || 'Group Chat'
  }, [session?.user])

  // Filter chat rooms based on search term
  const filteredChatRooms = useMemo(() => chatRooms.filter(room => {
    if (!roomSearchTerm) return true

    try {
      const searchLower = roomSearchTerm.toLowerCase()
      const roomName = getRoomDisplayName(room).toLowerCase()

      // Search in room name
      if (roomName.includes(searchLower)) return true

      // Search in recent messages
      if (room.messages && room.messages.length > 0) {
        const lastMessage = room.messages[0]
        if (lastMessage && lastMessage.content && lastMessage.sender) {
          const messageContent = lastMessage.content.toLowerCase()
          const senderName = (lastMessage.sender.name || lastMessage.sender.email || '').toLowerCase()

          if (messageContent.includes(searchLower) || senderName.includes(searchLower)) {
            return true
          }
        }
      }

      // Search in member names for group chats
      if (room.type !== 'direct' && room.members) {
        return room.members.some(member =>
          member?.user?.name?.toLowerCase().includes(searchLower) ||
          member?.user?.email?.toLowerCase().includes(searchLower)
        )
      }

      return false
    } catch (error) {
      // If any error occurs during filtering, include the room by default
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error filtering chat room:', error)
      }
      return true
    }
  }), [chatRooms, roomSearchTerm, getRoomDisplayName])

  const getRoomAvatar = (room: ChatRoomData) => {
    if (room.type === 'direct') {
      const otherUser = room.members.find(m => m.user.id !== (session?.user as AuthUser)?.id)
      return otherUser?.user.avatarUrl
    }
    return null
  }

  const getRoomIcon = (room: ChatRoomData) => {
    if (room.type === 'project' && room.project?.icon) {
      return room.project.icon
    }
    return null
  }

  if (loading) {
    return (
      <div className="h-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </div>
    )
  }

  const SidebarContent = () => {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-background/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Chat
              </h2>
            </div>
          </div>
          <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nowy Czat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={newChatType} onValueChange={(value: 'direct' | 'group' | 'project') => setNewChatType(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Typ czatu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Wiadomość Bezpośrednia</SelectItem>
                      <SelectItem value="group">Czat Grupowy</SelectItem>
                      <SelectItem value="project">Czat Projektu</SelectItem>
                    </SelectContent>
                  </Select>

                  {newChatType === 'group' && (
                    <Input
                      placeholder="Nazwa grupy"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full"
                    />
                  )}

                  {newChatType === 'project' && (
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz projekt" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              {project.icon && <span>{project.icon}</span>}
                              <span>{project.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {newChatType !== 'project' && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Szukaj użytkowników..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {filteredUsers.map((user) => (
                            <div
                              key={user.id}
                              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                newChatType === 'direct' ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                              } ${
                                selectedUsers.includes(user.id) ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                              }`}
                              onClick={() => {
                                if (newChatType === 'direct') {
                                  createDirectMessage(user.id)
                                } else {
                                  setSelectedUsers(prev =>
                                    prev.includes(user.id)
                                      ? prev.filter(id => id !== user.id)
                                      : [...prev, user.id]
                                  )
                                }
                              }}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatarUrl || undefined} />
                                <AvatarFallback>
                                  {user.name?.charAt(0) || user.email.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {user.name || user.email}
                                </p>
                                {user.name && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {user.email}
                                  </p>
                                )}
                              </div>
                              {selectedUsers.includes(user.id) && (
                                <Badge variant="secondary" className="ml-2">
                                  Wybrano
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {newChatType === 'group' && selectedUsers.length > 0 && (
                    <Button onClick={createGroupChat} className="w-full">
                      Stwórz czat grupowy
                    </Button>
                  )}

                  {newChatType === 'project' && selectedProject && (
                    <Button onClick={createProjectChat} className="w-full">
                      Stwórz czat projektu
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search bar */}
        <div className="">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj rozmów..."
              value={roomSearchTerm}
              onChange={(e) => setRoomSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-0 focus-visible:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {filteredChatRooms.map((room) => (
                <div
                  key={room.id}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                    selectedRoom?.id === room.id
                      ? 'bg-primary/10 border border-primary/20 shadow-sm'
                      : 'hover:bg-muted/50 border border-transparent hover:border-border/50'
                  }`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                      <AvatarImage src={getRoomAvatar(room) || undefined} />
                      <AvatarFallback
                        className="text-sm font-medium"
                        style={{ backgroundColor: room.type === 'project' && room.project?.color ? room.project.color : undefined }}
                      >
                        {room.type === 'direct' ? (
                          getRoomDisplayName(room).charAt(0).toUpperCase()
                        ) : room.type === 'project' && getRoomIcon(room) ? (
                          <span className="text-lg">{getRoomIcon(room)}</span>
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online status indicator for direct messages */}
                    {room.type === 'direct' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold truncate text-foreground w-[12rem]" title={getRoomDisplayName(room)}>
                        {getRoomDisplayName(room)}
                      </h4>
                      <div className="flex items-center gap-1">
                        {room.messages.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(room.messages[0].createdAt).toLocaleTimeString('pl-PL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                        {room.type === 'project' && (
                          <Badge variant="outline" className="text-xs h-5 px-2">
                            <span className="w-1.5 h-1.5 bg-current rounded-full mr-1" />
                            Projekt
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between " >
                      {room.messages.length > 0 ? (
                        <p className="text-xs text-muted-foreground w-[12rem]  truncate pr-2 whitespace-nowrap">
                          <span className="font-medium">
                            {room.messages[0].sender.name || room.messages[0].sender.email.split('@')[0]}
                          </span>
                          : {room.messages[0].content}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Brak wiadomości
                        </p>
                      )}
                      {room.members.length > 2 && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {room.members.length}
                        </span>
                      </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {chatRooms.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-2xl flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 opacity-50" />
                  </div>
                  <h3 className="font-semibold mb-2">Witaj w komunikatorze</h3>
                  <p className="text-sm text-muted-foreground mb-4">Utwórz swój pierwszy czat, aby rozpocząć współpracę</p>
                  <Button
                    onClick={() => setIsNewChatDialogOpen(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nowy czat
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background">
      {/* Mobile Sidebar */}
      {isMobile ? (
        <>
          {/* Mobile Chat Room */}
          {selectedRoom ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b bg-background flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedRoom(null)}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold">{getRoomDisplayName(selectedRoom)}</h3>
              </div>
              <ChatRoom room={selectedRoom} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="w-full">
                <SidebarContent />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Desktop Sidebar */}
          <div className="w-105 flex-shrink-0 border-r bg-muted/30 backdrop-blur-sm">
            <SidebarContent />
          </div>
          {/* Desktop Chat Area */}
          <div className="flex-1 flex flex-col bg-background">
            {selectedRoom ? (
              <ChatRoom room={selectedRoom} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40">
                <div className="text-center p-8 max-w-md">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-primary/10 rounded-3xl flex items-center justify-center">
                    <MessageCircle className="h-12 w-12 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Rozpocznij rozmowę</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Wybierz istniejący czat z listy po lewej stronie lub utwórz nową rozmowę, aby rozpocząć komunikację z zespołem.
                  </p>
                  <Button
                    onClick={() => setIsNewChatDialogOpen(true)}
                    className="gap-2 px-6"
                  >
                    <Plus className="h-4 w-4" />
                    Utwórz nowy czat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
