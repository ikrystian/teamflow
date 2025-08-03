"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { logout, forceLogout } from "@/lib/logout"

interface LogoutButtonProps {
  variant?: "button" | "dropdown"
  className?: string
  children?: React.ReactNode
  force?: boolean
}

export function LogoutButton({ 
  variant = "button", 
  className, 
  children,
  force = false 
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    try {
      if (force) {
        await forceLogout()
      } else {
        await logout()
      }
    } catch (error) {
      console.error("Logout failed:", error)
      // Try force logout as fallback
      await forceLogout()
    } finally {
      // Don't set to false since we should be redirected
    }
  }

  if (variant === "dropdown") {
    return (
      <DropdownMenuItem 
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={className}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {children || (isLoggingOut ? "Wylogowywanie..." : "Wyloguj się")}
      </DropdownMenuItem>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={className}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {children || (isLoggingOut ? "Wylogowywanie..." : "Wyloguj się")}
    </Button>
  )
}