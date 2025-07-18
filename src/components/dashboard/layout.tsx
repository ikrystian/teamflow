"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { TopBarUser } from "@/components/dashboard/top-bar-user"
import {
  Home,
  Users,
  FolderOpen,
  CheckSquare,
  Calendar,
  BarChart3,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  const navigation = [
    { name: "Panel", href: "/dashboard", icon: Home },
    { name: "Moje zadania", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "Zespoły", href: "/dashboard/teams", icon: Users },
    { name: "Projekty", href: "/dashboard/projects", icon: FolderOpen },
    { name: "Raporty", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Kalendarz", href: "/dashboard/calendar", icon: Calendar },
  ]

  // Function to check if a navigation item is active
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b">
            <div className="flex h-16 items-center px-4">
              <h1 className="text-xl font-bold text-foreground">TeamFlow</h1>
              <div className="ml-auto">
                <TopBarUser />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
