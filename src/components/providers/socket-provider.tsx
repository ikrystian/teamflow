'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  onlineUsers: Set<string>
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: new Set()
})

export function useSocket() {
  return useContext(SocketContext)
}

interface SocketProviderProps {
  children: React.ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const { data: session } = useSession()
  const user = session?.user as AuthUser | undefined;

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const socketInstance = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      transports: ['websocket']
    })

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server')
      setIsConnected(true)
      // Register user with socket server for chat room notifications
      socketInstance.emit('user-register', { userId: user.id })
      socketInstance.emit('user-online', { userId: user.id, userName: user.name || user.email })
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
    })

    socketInstance.on('user-online', (data: { userId: string }) => {
      setOnlineUsers(prev => new Set(prev).add(data.userId))
    })

    socketInstance.on('user-offline', (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(data.userId)
        return newSet
      })
    })

    socketInstance.on('online-users-list', (userIds: string[]) => {
      setOnlineUsers(new Set(userIds))
    })

    setSocket(socketInstance)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        socketInstance.emit('user-offline', { userId: user.id })
      } else {
        socketInstance.emit('user-online', { userId: user.id, userName: user.name || user.email })
      }
    }

    const handleBeforeUnload = () => {
      socketInstance.emit('user-offline', { userId: user.id })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      socketInstance.emit('user-offline', { userId: user.id })
      socketInstance.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [user?.id, user?.name, user?.email])

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  )
}