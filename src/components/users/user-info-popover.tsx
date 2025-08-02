"use client"

import { useState, useEffect, useCallback } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  User as UserIcon,
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2
} from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  jobTitle?: string | null
  createdAt: string
  stats: {
    totalAssignedTasks: number
    completedTasks: number
    totalHours: number
    completionRate: number
    teamsCount: number
  }
}

interface UserInfoPopoverProps {
  userId: string
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
}

export function UserInfoPopover({
  userId,
  children,
  side = "top",
  align = "center"
}: UserInfoPopoverProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchUserData = useCallback(async () => {
    if (loading) return
    
    setLoading(true)
    try {
      // Fetch user profile with stats
      const userResponse = await fetch(`/api/users/${userId}`)
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }, [userId, loading])

  useEffect(() => {
    if (isOpen && !user) {
      fetchUserData()
    }
  }, [isOpen, user, fetchUserData])

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays} dni temu`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} ${months === 1 ? 'miesiąc' : 'miesięcy'} temu`
    } else {
      const years = Math.floor(diffDays / 365)
      return `${years} ${years === 1 ? 'rok' : 'lat'} temu`
    }
  }

  const getRoleColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200"
      case "manager":
      case "team lead":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "developer":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "designer":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        side={side}
        align={align}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : user ? (
            <>
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatarUrl || ""} alt={user.name || ""} />
                    <AvatarFallback className="text-lg">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">
                      {user.name || "Bez nazwy"}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {user.jobTitle && (
                    <Badge variant="secondary" className={`text-xs ${getRoleColor(user.jobTitle)}`}>
                      {user.jobTitle}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Dołączył {formatJoinDate(user.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {user.stats && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground">Statystyki</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <div className="text-xs">
                          <span className="font-medium">{user.stats.completedTasks}</span>
                          <span className="text-muted-foreground"> / {user.stats.totalAssignedTasks}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">Zadania</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="text-xs">
                          <span className="font-medium">{user.stats.totalHours.toFixed(1)}h</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">Przepracowane</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div className="text-xs">
                          <span className="font-medium">{user.stats.completionRate}%</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">Ukończenie</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="text-xs">
                          <span className="font-medium">{user.stats.teamsCount}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">Zespoły</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                    window.open(`/dashboard/profile/${userId}`, '_blank')
                  }}
                >
                  <UserIcon className="h-3 w-3 mr-1" />
                  Zobacz profil
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Nie udało się załadować danych użytkownika
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}