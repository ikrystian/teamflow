"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Settings,
  LogOut,
} from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LogoutButton } from "@/components/auth/logout-button"

interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export function TopBarUser() {
  const { data: session } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // Fetch user profile to get the correct avatar
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.email) return

      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const profile = await response.json()
          setUserProfile(profile)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }

    fetchUserProfile()
  }, [session?.user?.email])

  // Use userProfile data if available, fallback to session data
  const displayName = userProfile?.name || session?.user?.name
  const displayEmail = userProfile?.email || session?.user?.email
  const avatarUrl = userProfile?.avatarUrl || session?.user?.image

  return (
    <div className="flex items-center gap-x-4 lg:gap-x-6">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl || ""} alt={displayName || ""} />
              <AvatarFallback>
                {displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {displayEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Ustawienia</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <LogoutButton variant="dropdown" />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
