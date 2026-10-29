"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { logout } from "@/lib/logout"

interface LogoutButtonProps {
  variant?: "button" | "dropdown"
  className?: string
  children?: React.ReactNode
}

export function LogoutButton({
  variant = "button",
  className,
  children,
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    // logout() always redirects to the sign-in page, also when the API call fails
    await logout()
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