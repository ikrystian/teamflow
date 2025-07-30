"use client"

import {
  MoreHorizontal,
  Eye,
  Share,
  Settings,
  Archive,
  Trash2,
  Info,
  ChevronDown,
  ChevronRight,
  Edit,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Import all possible project icons
import * as LucideIcons from "lucide-react"

interface Project {
  id: string
  name: string
  color?: string
  icon?: string
  archived?: boolean
  team: {
    id: string
    name: string
  }
}

interface NavProjectsProps {
  projects: Project[]
  onEditProject?: (project: Project) => void
}

// Helper function to render project icon
function ProjectIcon({ iconName, color, className = "w-4 h-4" }: {
  iconName?: string | null,
  color?: string,
  className?: string
}) {
  if (!iconName) {
    // Fallback to colored square if no icon
    return (
      <div
        className={`${className} rounded-sm flex-shrink-0`}
        style={{ backgroundColor: color || '#3B82F6' }}
      />
    )
  }

  // Get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[iconName]

  if (!IconComponent) {
    // Fallback to colored square if icon not found
    return (
      <div
        className={`${className} rounded-sm flex-shrink-0`}
        style={{ backgroundColor: color || '#3B82F6' }}
      />
    )
  }

  return (
    <IconComponent
      className={className}
      style={{ color: color || '#3B82F6' }}
    />
  )
}

export function NavProjects({ projects, onEditProject }: NavProjectsProps) {
  const { isMobile } = useSidebar()
  const [showArchived, setShowArchived] = useState(false)
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([])
  const [archivedProjectsLoaded, setArchivedProjectsLoaded] = useState(false)

  // Filtruj projekty na aktywne i archiwizowane
  const activeProjects = projects.filter(project => !project.archived)
  const archivedProjectsFromProps = projects.filter(project => project.archived)

  // Pobierz archiwizowane projekty gdy użytkownik chce je zobaczyć
  useEffect(() => {
    if (showArchived && !archivedProjectsLoaded) {
      const fetchArchivedProjects = async () => {
        try {
          const response = await fetch('/api/projects?includeArchived=true&archivedOnly=true')
          if (response.ok) {
            const data = await response.json()
            setArchivedProjects(data.projects || [])
            setArchivedProjectsLoaded(true)
          }
        } catch (error) {
          console.error('Error fetching archived projects:', error)
        }
      }
      fetchArchivedProjects()
    }
  }, [showArchived, archivedProjectsLoaded])

  // Użyj archiwizowanych projektów z props jeśli są dostępne, w przeciwnym razie użyj pobranych
  const displayedArchivedProjects = showArchived
    ? (archivedProjectsFromProps.length > 0 ? archivedProjectsFromProps : archivedProjects)
    : []

  // Liczba archiwizowanych projektów do wyświetlenia w tooltip
  const archivedCount = archivedProjectsFromProps.length > 0
    ? archivedProjectsFromProps.length
    : archivedProjects.length

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Lista projektów</SidebarGroupLabel>
      <SidebarMenu>
        {/* Aktywne projekty */}
        {activeProjects.map((project) => (
          <SidebarMenuItem key={project.id}>
            <SidebarMenuButton asChild tooltip={project.name}>
              <Link href={`/dashboard/projects/${project.id}`}>
                <ProjectIcon
                  iconName={project.icon}
                  color={project.color}
                  className="w-4 h-4 flex-shrink-0"
                />
                <span className="truncate">{project.name}</span>
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

                {onEditProject && (
                  <DropdownMenuItem onClick={() => onEditProject(project)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edytuj projekt
                  </DropdownMenuItem>
                )}

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

        {/* Przycisk "Więcej" z tooltipem pokazującym liczbę archiwizowanych projektów */}
        <SidebarMenuItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton
                onClick={() => setShowArchived(!showArchived)}
                className="cursor-pointer"
              >
                {showArchived ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>Więcej</span>
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              {archivedCount > 0
                ? `${archivedCount} projektów zarchiwizowanych`
                : "Brak zarchiwizowanych projektów"
              }
            </TooltipContent>
          </Tooltip>
        </SidebarMenuItem>

        {/* Archiwizowane projekty (pokazywane po kliknięciu "Więcej") */}
        {displayedArchivedProjects.map((project) => (
          <SidebarMenuItem key={`archived-${project.id}`}>
            <SidebarMenuButton asChild tooltip={`${project.name} (zarchiwizowany)`}>
              <Link href={`/dashboard/projects/${project.id}`}>
                <div className="opacity-60">
                  <ProjectIcon
                    iconName={project.icon}
                    color={project.color}
                    className="w-4 h-4 flex-shrink-0"
                  />
                </div>
                <span className="truncate opacity-60">{project.name}</span>
                <Archive className="h-3 w-3 ml-auto opacity-60" />
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

                {onEditProject && (
                  <DropdownMenuItem onClick={() => onEditProject(project)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edytuj projekt
                  </DropdownMenuItem>
                )}

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
                  Przywróć projekt
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
