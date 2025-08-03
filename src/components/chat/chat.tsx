'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Plus, Users, Search } from 'lucide-react'
import { ChatRoom } from './chat-room'
import { useSocket } from '@/components/providers/socket-provider'

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

interface ChatRoomData {
  id: string
  name: string | null
  type: string
  createdAt: string
  project?: Project
  members: Array<{
    user: User
  }>
  messages: Array<{
    id: string
    content: string
    createdAt: string
    sender: User
    senderId: string
    chatRoomId: string
  }>
}

export function Chat() {
  const { data: session } = useSession()
  const { socket, isConnected } = useSocket()
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetchChatRooms()
      fetchUsers()
      fetchProjects()
    }
  }, [session?.user?.id])

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

  const fetchChatRooms = async () => {
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
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        const allUsers = data.users || data // Handle both { users: [...] } and [...] formats
        setUsers(allUsers.filter((user: User) => user.id !== session?.user?.id))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

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

  const getRoomDisplayName = (room: ChatRoomData) => {
    if (room.type === 'direct') {
      const otherUser = room.members.find(m => m.user.id !== session?.user?.id)
      return otherUser?.user.name || otherUser?.user.email || 'Unknown User'
    }
    if (room.type === 'project' && room.project) {
      return room.project.name
    }
    return room.name || 'Group Chat'
  }

  const getRoomAvatar = (room: ChatRoomData) => {
    if (room.type === 'direct') {
      const otherUser = room.members.find(m => m.user.id !== session?.user?.id)
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
      <Card className="h-full">
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
      </Card>
    )
  }

  return (
    <div className="h-[calc(100vh-101px)] -my-6 -mx-4 flex">
      <div className="w-100 border-r">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Czat
              </CardTitle>
              <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nowy Czat</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={newChatType} onValueChange={(value: 'direct' | 'group' | 'project') => setNewChatType(value)}>
                      <SelectTrigger>
                        <SelectValue />
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
                      />
                    )}

                    {newChatType === 'project' && (
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger>
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
                        />
                        <ScrollArea className="h-48">
                          <div className="space-y-2">
                            {filteredUsers.map((user) => (
                            <div
                              key={user.id}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                                newChatType === 'direct' ? 'hover:bg-blue-50' : ''
                              } ${
                                selectedUsers.includes(user.id) ? 'bg-blue-50' : ''
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
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(50vw)]">
              <div className="space-y-1 p-3">
                {chatRooms.map((room) => (
                  <div
                    key={room.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRoom?.id === room.id
                        ? 'bg-blue-100 dark:bg-blue-900/20'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getRoomAvatar(room) || undefined} />
                      <AvatarFallback style={{ backgroundColor: room.type === 'project' && room.project?.color ? room.project.color : undefined }}>
                        {room.type === 'direct' ? (
                          getRoomDisplayName(room).charAt(0)
                        ) : room.type === 'project' && getRoomIcon(room) ? (
                          <span className="text-lg">{getRoomIcon(room)}</span>
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {getRoomDisplayName(room)}
                          </p>
                          {room.type === 'project' && (
                            <Badge variant="outline" className="text-xs">
                              Projekt
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {room.members.length}
                        </Badge>
                      </div>
                      {room.messages.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          {room.messages[0].content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {chatRooms.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Brak czatów</p>
                    <p className="text-xs">Utwórz swój pierwszy czat, aby rozpocząć</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      <div className="flex-1">
        {selectedRoom ? (
          <ChatRoom room={selectedRoom} />
        ) : (
          <Card className="h-full rounded-none border-0">
            <CardContent className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Wybierz czat, aby rozpocząć rozmowę</h3>
                <p className="text-sm">Wybierz z istniejących rozmów lub rozpocznij nową</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
