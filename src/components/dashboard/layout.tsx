"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"

import {
  Home,
  CheckSquare,
  FolderOpen,
  BarChart3,
  Zap,
  Contact,
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
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs"
import { EditProjectSheet } from "@/components/projects/edit-project-sheet"
import { HeaderProvider, useHeader } from "@/contexts/header-context"
import { useProjects } from "@/contexts/projects-context"
import { type Project } from "@/types"

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const { headerContent } = useHeader()
  const pathname = usePathname()
  const { projects, refreshProjects } = useProjects()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const navigation = [
    { name: "Panel", href: "/dashboard", icon: Home },
    { name: "Moje zadania", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "Test REST", href: "/dashboard/test-webhook", icon: Zap },
    { name: "Projekty", href: "/dashboard/projects", icon: FolderOpen },
    { name: "Klienci", href: "/dashboard/clients", icon: Contact },
    { name: "Raporty", href: "/dashboard/reports", icon: BarChart3 },
  ]

  // Function to check if a navigation item is active
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  // Handle project editing from sidebar
  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setEditDialogOpen(true)
  }

  const handleProjectUpdated = () => {
    setEditDialogOpen(false)
    setSelectedProject(null)
    // Refresh projects list
    refreshProjects()
  }



  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader>
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

          <NavProjects projects={projects} onEditProject={handleEditProject} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1">
              {headerContent}
            </div>
          </div>
        </header>
        <DashboardBreadcrumbs />
        <main className={`flex-1 transition-all duration-300 overflow-hidden`}>
          <div className="min-w-0 w-full ">
            {children}
          </div>
        </main>
      </SidebarInset>

      <EditProjectSheet
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProjectUpdated={handleProjectUpdated}
        project={selectedProject}
      />

    </SidebarProvider>
  )
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <HeaderProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </HeaderProvider>
  )
}
