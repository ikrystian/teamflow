'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, Smile, AtSign } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MentionInput } from './mention-input'

interface User {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface ChatInputProps {
  onSendMessage: (content: string) => void
  onTyping: () => void
  users: User[]
}

export function ChatInput({ onSendMessage, onTyping, users }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close mention dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowMentions(false)
      }
    }

    if (showMentions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMentions])

  // Common emojis for quick access
  const commonEmojis = [
    '😊', '😂', '😍', '🤔', '😎', '😢', '😡', '😱',
    '👍', '👎', '❤️', '🔥', '💯', '✨', '🎉', '👏',
    '💪', '🙏', '👀', '🤝', '✅', '❌', '⚡', '🚀'
  ]

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention dropdown is open, let it handle navigation keys
    if (showMentions && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      return // Let MentionInput handle these
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key !== 'Enter') {
      onTyping()
    }
  }

  const handleChange = (value: string) => {
    setMessage(value)
    if (value.length > 0) {
      onTyping()
    }

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }

    // Check for mention trigger
    checkForMention(value, textareaRef.current?.selectionStart || 0)
  }

  const checkForMention = (text: string, cursorPos: number) => {
    // Find the last @ before cursor position
    const beforeCursor = text.slice(0, cursorPos)
    const lastAtIndex = beforeCursor.lastIndexOf('@')

    if (lastAtIndex === -1) {
      setShowMentions(false)
      return
    }

    // Check if there's a space between @ and cursor (which would end the mention)
    const afterAt = beforeCursor.slice(lastAtIndex + 1)
    if (afterAt.includes(' ') || afterAt.includes('\n')) {
      setShowMentions(false)
      return
    }

    // Show mention dropdown
    setMentionSearch(afterAt)
    setShowMentions(true)
    setCursorPosition(cursorPos)

    // Calculate position for mention dropdown
    if (textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect()
      setMentionPosition({
        top: rect.bottom,
        left: rect.left + 50 // Approximate position
      })
    }
  }

  const handleMentionSelect = (user: User) => {
    if (!textareaRef.current) return

    const beforeCursor = message.slice(0, cursorPosition)
    const afterCursor = message.slice(cursorPosition)
    const lastAtIndex = beforeCursor.lastIndexOf('@')

    if (lastAtIndex === -1) return

    const beforeMention = message.slice(0, lastAtIndex)
    const mentionText = `@[${user.id}] `
    const newMessage = beforeMention + mentionText + afterCursor

    setMessage(newMessage)
    setShowMentions(false)

    // Focus and set cursor position after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleAtSignClick = () => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart || 0
      const newMessage = message.slice(0, cursorPos) + '@' + message.slice(cursorPos)
      setMessage(newMessage)

      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = cursorPos + 1
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
          checkForMention(newMessage, newCursorPos)
        }
      }, 0)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const newMessage = message + emoji
    setMessage(newMessage)
    setIsEmojiOpen(false)

    // Focus textarea after emoji selection
    if (textareaRef.current) {
      textareaRef.current.focus()
    }

    // Trigger typing
    onTyping()
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-end gap-3 p-3 bg-muted/30 rounded-2xl border border-border/50 focus-within:border-primary/50 focus-within:bg-background transition-all duration-200">
        {/* Action buttons on the left */}
        <div className="flex items-center gap-1 pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>

        {/* Message input */}
        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napisz wiadomość..."
            className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />
        </div>

        {/* Action buttons on the right */}
        <div className="flex items-center gap-1 pb-2">
          <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="top" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium">Wybierz emoji</p>
                <div className="grid grid-cols-8 gap-1">
                  {commonEmojis.map((emoji, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-muted text-lg"
                      onClick={() => handleEmojiSelect(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleAtSignClick}
          >
            <AtSign className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            size="icon"
            className="h-8 w-8 ml-1"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mention dropdown */}
      {showMentions && (
        <MentionInput
          users={users}
          onSelect={handleMentionSelect}
          onClose={() => setShowMentions(false)}
          position={mentionPosition}
          searchTerm={mentionSearch}
        />
      )}

      {/* Hint text */}
      <p className="text-xs text-muted-foreground mt-2 px-1">
        <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Enter</kbd> aby wysłać,
        <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift + Enter</kbd> dla nowej linii
        <span className="ml-2">•</span>
        <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border ml-1">@</kbd> aby oznaczyć użytkownika
      </p>
    </div>
  )
}
