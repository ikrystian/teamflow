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
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { NavUser } from "@/components/dashboard/nav-user"
import { NavProjects } from "@/components/dashboard/nav-projects"
import { TeamSwitcher } from "@/components/dashboard/team-switcher"

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
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader>
          <TeamSwitcher teams={[
            {
              name: "TeamFlow Pro",
              logo: () => <div className="w-4 h-4 bg-blue-500 rounded" />,
              plan: "Pro"
            },
            {
              name: "TeamFlow Enterprise",
              logo: () => <div className="w-4 h-4 bg-purple-500 rounded" />,
              plan: "Enterprise"
            }
          ]} />
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
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h2 className="text-lg font-semibold">Dashboard</h2>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
