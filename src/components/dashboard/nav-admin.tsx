"use client"
import { useState, useEffect } from "react"
import { Activity } from "lucide-react"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"

interface NavAdminProps {
  onRecentChangesClick?: () => void
}

export function NavAdmin({ onRecentChangesClick }: NavAdminProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/system-changes/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnreadCount()
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRecentChangesClick = () => {
    onRecentChangesClick?.()
    // Reset unread count when panel is opened
    setUnreadCount(0)
  }

  return (
    <SidebarGroup  className="-mb-5" >
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={handleRecentChangesClick}
            tooltip="Zarządzaj ostatnimi zmianami"
          >
            <Activity className="w-4 h-4" />
            <span>Ostatnie zmiany</span>
            {!loading && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto min-w-5 h-5 text-xs p-0 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
