'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface MentionInputProps {
  users: User[]
  onSelect: (user: User) => void
  onClose: () => void
  position: { top: number; left: number }
  searchTerm: string
}

export function MentionInput({ users, onSelect, onClose, position, searchTerm }: MentionInputProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const name = user.name?.toLowerCase() || ''
    const email = user.email.toLowerCase()
    const search = searchTerm.toLowerCase()
    return name.includes(search) || email.includes(search)
  })

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchTerm])

  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      const keyboardEvent = e as unknown as KeyboardEvent
      if (keyboardEvent.key === 'ArrowDown') {
        keyboardEvent.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredUsers.length - 1))
      } else if (keyboardEvent.key === 'ArrowUp') {
        keyboardEvent.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (keyboardEvent.key === 'Enter') {
        keyboardEvent.preventDefault()
        if (filteredUsers[selectedIndex]) {
          onSelect(filteredUsers[selectedIndex])
        }
      } else if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, filteredUsers, onSelect, onClose])

  if (filteredUsers.length === 0) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg"
      style={{
        top: position.top - 200, // Show above the input
        left: position.left,
      }}
    >
      <div className="p-2">
        <p className="text-xs text-muted-foreground mb-2">Oznacz użytkownika</p>
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                  index === selectedIndex
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                )}
                onClick={() => onSelect(user)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {(user.name?.charAt(0) || user.email.charAt(0)).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name || user.email.split('@')[0]}
                  </p>
                  {user.name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
