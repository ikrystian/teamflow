"use client"

import {
  FolderOpen,
  MoreHorizontal,
  Eye,
  Share,
  Settings,
  Archive,
  Trash2,
  Info,
} from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface Project {
  id: string
  name: string
  color?: string
  team: {
    id: string
    name: string
  }
}

interface NavProjectsProps {
  projects: Project[]
}

export function NavProjects({ projects }: NavProjectsProps) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Lista projektów</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((project) => (
          <SidebarMenuItem key={project.id}>
            <SidebarMenuButton asChild>
              <Link href={`/dashboard/projects/${project.id}`}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: project.color || '#3B82F6' }}
                  />
                  <span className="truncate">{project.name}</span>
                </div>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">Więcej</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
              >
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Zobacz projekt
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/projects/${project.id}/info`}>
                    <Info className="h-5 w-5" />
                    Informacje o projekcie
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/projects/${project.id}/settings`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Ustawienia
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Share className="mr-2 h-4 w-4" />
                  Udostępnij projekt
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Archive className="mr-2 h-4 w-4" />
                  Archiwizuj projekt
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń projekt
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
