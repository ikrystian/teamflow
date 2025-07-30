"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

import { ChevronLeft, ChevronRight, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface RightSidebarProps {
  children: React.ReactNode
  className?: string
}

export function RightSidebar({ children, className }: RightSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full bg-background border-l transition-all duration-300 ease-in-out z-30",
        isCollapsed ? "w-12" : "w-[400px]",
        className
      )}
    >
      {/* Toggle Button */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 rounded-full bg-background border shadow-md hover:shadow-lg"
        >
          {isCollapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className={cn("h-full", isCollapsed && "hidden")}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <h2 className="font-semibold">Ostatnie zmiany</h2>
          </div>
        </div>
        <div className="h-[calc(100vh-80px)] overflow-y-auto">
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>

      {/* Collapsed State Icon */}
      {isCollapsed && (
        <div className="flex items-center justify-center h-full">
          <Activity className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

interface RightSidebarTriggerProps {
  isVisible: boolean
  onToggle: () => void
}

export function RightSidebarTrigger({ isVisible, onToggle }: RightSidebarTriggerProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className="flex items-center gap-2"
    >
      <Activity className="h-4 w-4" />
      {isVisible ? "Ukryj zmiany" : "Pokaż zmiany"}
    </Button>
  )
}
