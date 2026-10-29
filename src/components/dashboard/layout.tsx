"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Suspense, useEffect, useState } from "react"

import {
  Activity,
  Bell,
  Home,
  CheckSquare,
  FolderOpen,
  BarChart3,
  Inbox,
  Lock,
  Search,
  ShieldCheck,
  Users,
  Vault,
  Zap,
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
  SidebarMenuBadge,
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
import { CommandPalette, usePalette } from "@/components/layout/command-palette"
import { NotificationsBell } from "@/components/layout/notifications-bell"
import { ShortcutsDialog } from "@/components/layout/shortcuts-dialog"
import { VaultSession } from "@/components/layout/vault-gate"
import { StepUpDialog } from "@/components/vault/step-up-dialog"
import { HeaderProvider, useHeader } from "@/contexts/header-context"
import { useProjects } from "@/contexts/projects-context"
import type { UserPreferences } from "@/lib/db/schema"
import type { Role } from "@/lib/permissions"
import { lockVault, useVault } from "@/lib/vault/store"
import { type Project } from "@/types"

/** Moduł klientów i sejfu w powłoce panelu (brak = osoba bez dostępu do CRM, np. rola „manager”). */
export type CrmShellInfo = {
  workspace: { id: string; name: string; role: Role } | null
  preferences: UserPreferences
  counts: { inbox: number; tasks: number }
  canSeeActivity: boolean
}

interface DashboardLayoutProps {
  children: React.ReactNode
  crm: CrmShellInfo | null
}

const primaryNavigation = [
  { name: "Panel", href: "/dashboard", icon: Home },
  { name: "Moje zadania", href: "/dashboard/tasks", icon: CheckSquare },
]

const workspaceNavigation = [
  { name: "Projekty", href: "/dashboard/projects", icon: FolderOpen },
  { name: "Raporty", href: "/dashboard/reports", icon: BarChart3 },
  { name: "GitHub Webhooks", href: "/dashboard/github-webhook", icon: Webhook },
]

type NavItem = { name: string; href: string; icon: React.ComponentType; badge?: number }

function DashboardLayoutInner({ children, crm }: DashboardLayoutProps) {
  const { headerContent } = useHeader()
  const pathname = usePathname()
  const { projects, refreshProjects, reorderProjects } = useProjects()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const openPalette = usePalette((s) => s.setOpen)
  const vaultUnlocked = useVault((s) => s.status === "unlocked")

  const clientNavigation: NavItem[] = crm
    ? [
        { name: "Klienci", href: "/dashboard/clients", icon: Users },
        { name: "Sejf dostępów", href: "/dashboard/vault", icon: Vault },
        { name: "Do przejrzenia", href: "/dashboard/inbox", icon: Inbox, badge: crm.counts.inbox },
        { name: "Kondycja haseł", href: "/dashboard/security", icon: ShieldCheck, badge: crm.counts.tasks },
        ...(crm.canSeeActivity ? [{ name: "Dziennik zdarzeń", href: "/dashboard/activity", icon: Activity }] : []),
      ]
    : []

  // Function to check if a navigation item is active
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === href || pathname.startsWith(`${href}/`)
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

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.name}>
        <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.name}>
          <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
            <item.icon />
            <span>{item.name}</span>
          </Link>
        </SidebarMenuButton>
        {item.badge ? (
          <SidebarMenuBadge className="text-[11px] font-medium" aria-label={`${item.badge} do zrobienia`}>
            {item.badge}
          </SidebarMenuBadge>
        ) : null}
      </SidebarMenuItem>
    ))

  return (
    <SidebarProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2">
        Przejdź do treści
      </a>
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
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => openPalette(true)} tooltip="Szukaj (Ctrl K)">
                    <Search />
                    <span>Szukaj</span>
                    <kbd className="ml-auto rounded border bg-muted px-1.5 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">Ctrl K</kbd>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {renderNavItems(primaryNavigation)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="pt-0">
            <SidebarGroupLabel>Przestrzeń robocza</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderNavItems(workspaceNavigation)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {crm && (
            <SidebarGroup className="pt-0">
              <SidebarGroupLabel>Klienci i dostępy</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{renderNavItems(clientNavigation)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          <NavProjects projects={projects} onEditProject={handleEditProject} onReorderProjects={reorderProjects} />
        </SidebarContent>
        <SidebarFooter className="gap-1">
          <SidebarMenu>
            {crm && vaultUnlocked && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => lockVault("manual")} tooltip="Zablokuj sejf (Ctrl ⇧ L)">
                  <Lock />
                  <span>Zablokuj sejf</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings")} tooltip="Ustawienia">
                <Link href="/dashboard/settings">
                  <Settings />
                  <span>Ustawienia</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <NavUser onShortcuts={() => setShortcutsOpen(true)} />
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
          <Button
            variant="outline"
            size="sm"
            className="hidden h-8 w-56 justify-start gap-2 text-muted-foreground lg:flex"
            onClick={() => openPalette(true)}
          >
            <Search className="size-4" />
            <span className="flex-1 truncate text-left font-normal">Szukaj…</span>
            <kbd className="rounded border bg-muted px-1.5 text-[10px]">Ctrl K</kbd>
          </Button>
          {crm?.workspace && vaultUnlocked && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => lockVault("manual")} aria-label="Zablokuj sejf">
                  <Lock className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Sejf odblokowany — kliknij, aby zablokować</TooltipContent>
            </Tooltip>
          )}
          <NotificationsBell icon={<Bell className="size-4" aria-hidden />} />
          <ThemeToggle />
        </header>
        {headerContent && (
          <div className="flex min-h-14 shrink-0 items-center border-b px-4 py-2.5 md:px-6">
            {headerContent}
          </div>
        )}
        <div id="main" tabIndex={-1} className="dashboard-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </SidebarInset>

      <EditProjectSheet
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProjectUpdated={handleProjectUpdated}
        project={selectedProject}
      />

      {crm?.workspace && <VaultSession workspace={{ id: crm.workspace.id, role: crm.workspace.role }} preferences={crm.preferences} />}
      <Suspense>
        <CommandPalette crm={Boolean(crm)} onShortcuts={() => setShortcutsOpen(true)} />
      </Suspense>
      <StepUpDialog />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </SidebarProvider>
  )
}

export function DashboardLayout({ children, crm }: DashboardLayoutProps) {
  return (
    <HeaderProvider>
      <DashboardLayoutInner crm={crm}>{children}</DashboardLayoutInner>
    </HeaderProvider>
  )
}
