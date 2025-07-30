"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"

import {
  Home,
  Users,
  CheckSquare,
  Calendar,
  BarChart3,
  FolderOpen,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/dashboard/nav-user"
import { NavProjects } from "@/components/dashboard/nav-projects"

interface Project {
  id: string
  name: string
  color?: string
  team: {
    id: string
    name: string
  }
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [projects, setProjects] = useState<Project[]>([])

  const navigation = [
    { name: "Panel", href: "/dashboard", icon: Home },
    { name: "Moje zadania", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "Zespoły", href: "/dashboard/teams", icon: Users },
    { name: "Raporty", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Kalendarz", href: "/dashboard/calendar", icon: Calendar },
    { name: "Projekty", href: "/dashboard/projects", icon: FolderOpen },
  ]

  // Function to check if a navigation item is active
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  // Fetch projects (exclude archived by default)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects?includeArchived=false')
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
      }
    }

    fetchProjects()
  }, [])

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b">
            <div className="flex h-16 items-center px-4">
              <h1 className="text-xl font-bold text-foreground">TeamFlow</h1>
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

            <NavProjects projects={projects} />

          </SidebarContent>
          <SidebarFooter>
            <NavUser />
          </SidebarFooter>
        </Sidebar>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
