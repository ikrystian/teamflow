'use client'

import { useState, KeyboardEvent, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, Smile, AtSign } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  onTyping: () => void
}

export function ChatInput({ onSendMessage, onTyping }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    <div className="relative">
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
      
      {/* Hint text */}
      <p className="text-xs text-muted-foreground mt-2 px-1">
        <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Enter</kbd> aby wysłać, 
        <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift + Enter</kbd> dla nowej linii
      </p>
    </div>
  )
}
