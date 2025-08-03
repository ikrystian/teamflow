'use client'

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  onTyping: () => void
}

export function ChatInput({ onSendMessage, onTyping }: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
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
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Textarea
          value={message}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Wpisz wiadomość..."
          className="min-h-[40px] max-h-32 resize-none"
          rows={1}
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={!message.trim()}
        size="icon"
        className="mb-[2px]"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
