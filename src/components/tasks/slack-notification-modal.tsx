"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MessageSquare } from "lucide-react"
import { toast } from "sonner"

interface SlackUser {
  id: string
  name: string
  real_name?: string
  profile?: {
    image_24?: string
    image_32?: string
    image_48?: string
    image_72?: string
    display_name?: string
  }
}

interface SlackNotificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: {
    id: string
    title: string
    description?: string
    project?: {
      name: string
    }
  }
}

export function SlackNotificationModal({
  open,
  onOpenChange,
  task,
}: SlackNotificationModalProps) {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [slackUsers, setSlackUsers] = useState<SlackUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")

  useEffect(() => {
    if (open) {
      fetchSlackUsers()
    }
  }, [open])

  const fetchSlackUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/slack/users')
      if (response.ok) {
        const data = await response.json()
        setSlackUsers(data.users || [])
      } else {
        const error = await response.json()
        toast.error(error.message || "Błąd podczas pobierania użytkowników Slack")
      }
    } catch (error) {
      console.error("Error fetching Slack users:", error)
      toast.error("Błąd podczas łączenia ze Slack")
    } finally {
      setLoading(false)
    }
  }

  const sendSlackNotification = async () => {
    if (!selectedUserId) {
      toast.error("Wybierz użytkownika Slack")
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/slack/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          projectName: task.project?.name,
        }),
      })

      if (response.ok) {
        toast.success("Powiadomienie zostało wysłane na Slack")
        onOpenChange(false)
        setSelectedUserId("")
      } else {
        const error = await response.json()
        toast.error(error.message || "Błąd podczas wysyłania powiadomienia")
      }
    } catch (error) {
      console.error("Error sending Slack notification:", error)
      toast.error("Błąd podczas wysyłania powiadomienia")
    } finally {
      setSending(false)
    }
  }

  const getUserDisplayName = (user: SlackUser) => {
    return user.profile?.display_name || user.real_name || user.name
  }

  const getUserAvatar = (user: SlackUser) => {
    return user.profile?.image_32 || user.profile?.image_24
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Powiadom użytkownika
          </DialogTitle>
          <DialogDescription>
            Wybierz użytkownika Slack, który ma otrzymać powiadomienie o zadaniu <strong>{task.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Ładowanie użytkowników Slack...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium">Użytkownik Slack</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz użytkownika..." />
                </SelectTrigger>
                <SelectContent>
                  {slackUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={getUserAvatar(user)} />
                          <AvatarFallback className="text-xs">
                            {getUserDisplayName(user).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{getUserDisplayName(user)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Anuluj
            </Button>
            <Button
              onClick={sendSlackNotification}
              disabled={loading || sending || !selectedUserId}
            >
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Wyślij powiadomienie
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}