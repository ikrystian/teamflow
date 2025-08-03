"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Settings,
  MoreHorizontal,
  User as UserIcon,
  CreditCard,
  Bell
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { LogoutButton } from "@/components/auth/logout-button"

interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export function NavUser() {
  const { data: session } = useSession()
  const { isMobile } = useSidebar()
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
  const displayName = userProfile?.name || session?.user?.name || "User"
  const displayEmail = userProfile?.email || session?.user?.email || ""
  const avatarUrl = userProfile?.avatarUrl || session?.user?.image

  if (!session) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl || ""} alt={displayName} />
                <AvatarFallback className="rounded-lg">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{displayEmail}</span>
              </div>
              <MoreHorizontal className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl || ""} alt={displayName} />
                  <AvatarFallback className="rounded-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{displayEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Ustawienia
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Bell className="mr-2 h-4 w-4" />
                Powiadomienia
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <CreditCard className="mr-2 h-4 w-4" />
                Płatności
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <LogoutButton variant="dropdown" />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
