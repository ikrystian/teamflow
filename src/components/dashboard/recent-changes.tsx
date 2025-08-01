"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  XCircle,
  RefreshCw,
  Clock,
  EyeOff,
  Eye
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { pl } from "date-fns/locale"
import type { SystemChange } from "@/types"
import { SystemChangeFormTrigger } from "@/components/admin/system-change-form"

interface RecentChangesProps {
  limit?: number
  onUnreadCountChange?: (count: number) => void
}

export function RecentChanges({ limit = 5, onUnreadCountChange }: RecentChangesProps) {
  const { data: session } = useSession()
  const [changes, setChanges] = useState<SystemChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchChanges = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/system-changes?limit=${limit}`)

      if (!response.ok) {
        throw new Error("Nie udało się pobrać ostatnich zmian")
      }

      const data = await response.json()
      setChanges(data.systemChanges || [])
    } catch (err) {
      console.error("Error fetching system changes:", err)
      setError(err instanceof Error ? err.message : "Wystąpił błąd")
    } finally {
      setLoading(false)
    }
  }, [limit])

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/user/admin-status')
          if (response.ok) {
            const data = await response.json()
            setIsAdmin(data.isAdmin)
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
        }
      }
    }
    checkAdminStatus()
  }, [session])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/system-changes', {
        method: 'POST'
      })
      
      if (response.ok) {
        // Update changes to mark them as read
        setChanges(prev => prev.map(change => ({ ...change, isRead: true })))
        // Notify parent component about unread count change
        onUnreadCountChange?.(0)
      }
    } catch (error) {
      console.error('Error marking changes as read:', error)
    }
  }, [onUnreadCountChange])

  useEffect(() => {
    fetchChanges()
  }, [limit, fetchChanges])

  // Mark all as read when component mounts (when panel is opened)
  useEffect(() => {
    markAllAsRead()
  }, [markAllAsRead])

  const handleChangeAdded = (newChange: SystemChange) => {
    setChanges(prev => [newChange, ...prev])
  }

  const toggleChangeVisibility = async (changeId: string, currentVisibility: boolean) => {
    try {
      const response = await fetch(`/api/system-changes/${changeId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isVisible: !currentVisibility }),
      })

      if (response.ok) {
        setChanges(prev => prev.map(change => 
          change.id === changeId 
            ? { ...change, isVisible: !currentVisibility }
            : change
        ))
      }
    } catch (error) {
      console.error('Error toggling change visibility:', error)
    }
  }



  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <XCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchChanges}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Spróbuj ponownie
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (changes.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Brak ostatnich zmian do wyświetlenia
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">


      {/* Admin Controls */}
      {isAdmin && (
        <div className="pb-2 border-b">
          <SystemChangeFormTrigger onSuccess={handleChangeAdded} />
        </div>
      )}

      {changes.map((change) => (
        <Card key={change.id} className={`hover:shadow-sm transition-shadow ${!change.isVisible ? 'opacity-50' : ''}`}>
          <CardContent className="py-0 px-2">
            <div className="space-y-3">
              {/* Admin controls */}
              {isAdmin && (
                <div className="flex justify-end pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleChangeVisibility(change.id, change.isVisible)}
                    className="h-6 w-6 p-0"
                  >
                    {change.isVisible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}

              {/* Title */}
              <h4 className="font-medium text-sm leading-tight">
                {change.title}
                {!change.isVisible && (
                  <span className="ml-2 text-xs text-muted-foreground">(ukryte)</span>
                )}
              </h4>

              {/* Description */}
              {change.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {change.description}
                </p>
              )}

              {/* Footer with author and time */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={change.createdBy.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {change.createdBy.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {change.createdBy.name || "Nieznany użytkownik"}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(change.createdAt), {
                    addSuffix: true,
                    locale: pl
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
