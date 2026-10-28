"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"

import {
  Home,
  CheckSquare,
  FolderOpen,
  BarChart3,
  Zap,
  Contact,
  Webhook,
  SquarePen,
  Settings,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/ui/theme-toggle"
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

const primaryNavigation = [
  { name: "Panel", href: "/dashboard", icon: Home },
  { name: "Moje zadania", href: "/dashboard/tasks", icon: CheckSquare },
]

const workspaceNavigation = [
  { name: "Projekty", href: "/dashboard/projects", icon: FolderOpen },
  { name: "Klienci", href: "/dashboard/clients", icon: Contact },
  { name: "Raporty", href: "/dashboard/reports", icon: BarChart3 },
  { name: "GitHub Webhooks", href: "/dashboard/github-webhook", icon: Webhook },
]

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const { headerContent } = useHeader()
  const pathname = usePathname()
  const { projects, refreshProjects, reorderProjects } = useProjects()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

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

  // Every 5 minutes (and once shortly after mount) deliver any due task
  // reminders as push notifications. Mirrors the board's auto-move tick so the
  // automation also runs in dev without a system cron; the endpoint is
  // idempotent, so overlapping calls from several open tabs are harmless.
  useEffect(() => {
    const tick = () => {
      fetch("/api/cron/reminders").catch(() => {})
    }
    const initial = setTimeout(tick, 5000)
    const interval = setInterval(tick, 5 * 60 * 1000)
    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [])

  const renderNavItems = (items: typeof primaryNavigation) =>
    items.map((item) => (
      <SidebarMenuItem key={item.name}>
        <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.name}>
          <Link href={item.href}>
            <item.icon />
            <span>{item.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="pb-0">
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-1">
              <SidebarMenuButton asChild size="lg" className="h-10 flex-1 hover:bg-transparent active:bg-transparent">
                <Link href="/dashboard">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-[oklch(0.45_0.2_290)] text-primary-foreground shadow-sm">
                    <Zap className="size-3.5! fill-current" />
                  </div>
                  <span className="truncate text-sm font-semibold tracking-tight">Nexus</span>
                </Link>
              </SidebarMenuButton>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
                    asChild
                  >
                    <Link href="/dashboard/tasks/new" aria-label="Nowe zadanie">
                      <SquarePen />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Nowe zadanie</TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="gap-0">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>{renderNavItems(primaryNavigation)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="pt-0">
            <SidebarGroupLabel>Przestrzeń robocza</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderNavItems(workspaceNavigation)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <NavProjects projects={projects} onEditProject={handleEditProject} onReorderProjects={reorderProjects} />
        </SidebarContent>
        <SidebarFooter className="gap-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings")} tooltip="Ustawienia">
                <Link href="/dashboard/settings">
                  <Settings />
                  <span>Ustawienia</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      {/* The inset panel owns scrolling: the top bar and page header stay put
          while only the page body scrolls, Linear-style. */}
      <SidebarInset className="h-svh overflow-hidden md:h-[calc(100svh-1rem)] md:border md:shadow-xs">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger className="text-muted-foreground" />
          <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
          <div className="min-w-0 flex-1">
            <DashboardBreadcrumbs />
          </div>
          <ThemeToggle />
        </header>
        {headerContent && (
          <div className="flex min-h-14 shrink-0 items-center border-b px-4 py-2.5 md:px-6">
            {headerContent}
          </div>
        )}
        <div className="dashboard-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
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
