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
  GripVertical,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { DropIndicator } from "@/components/ui/drop-indicator"
import { reorderWithEdge, type Edge } from "@/lib/dnd-utils"

// Import all possible project icons
import * as LucideIcons from "lucide-react"
import { type Project } from "@/types"

interface NavProjectsProps {
  projects: Project[]
  onEditProject?: (project: Project) => void
  onDeleteProject?: (project: Project) => void
  onReorderProjects?: (orderedIds: string[]) => Promise<void>
}

// Helper function to render project icon
function ProjectIcon({ iconName, color, className = "w-4 h-4" }: {
  iconName?: string | null,
  color?: string,
  className?: string
}) {
  if (!iconName) {
    return (
      <div
        className={`${className} rounded-sm flex-shrink-0`}
        style={{ backgroundColor: color || '#3B82F6' }}
      />
    )
  }

  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[iconName]

  if (!IconComponent) {
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

interface SortableProjectItemProps {
  project: Project
  onEditProject?: (project: Project) => void
  onDeleteProject?: (project: Project) => void
  isMobile: boolean
  isActive: boolean
}

function SortableProjectItem({ project, onEditProject, onDeleteProject, isMobile, isActive }: SortableProjectItemProps) {
  const ref = useRef<HTMLLIElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)

  const todoCount = project.tasks?.filter(task => {
    const statusName = task.taskStatus?.name?.toLowerCase()
    return statusName !== 'done'
  }).length || 0

  const badgeStyle = project.color
    ? { backgroundColor: `${project.color}15`, color: project.color }
    : {}

  useEffect(() => {
    const element = ref.current
    const handle = handleRef.current
    if (!element || !handle) return

    return combine(
      draggable({
        element,
        dragHandle: handle,
        getInitialData: () => ({ type: "project", projectId: project.id }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => source.data.type === "project",
        getData: ({ input, element }) =>
          attachClosestEdge(
            { projectId: project.id },
            { input, element, allowedEdges: ["top", "bottom"] }
          ),
        onDrag: ({ self, source }) => {
          if (source.data.projectId === project.id) {
            setClosestEdge(null)
            return
          }
          setClosestEdge(extractClosestEdge(self.data))
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      })
    )
  }, [project.id])

  return (
    <SidebarMenuItem ref={ref} style={{ opacity: isDragging ? 0.4 : 1, position: "relative" }}>
      {closestEdge && <DropIndicator edge={closestEdge} />}
      {/* Drag handle — visible on hover, absolute so it doesn't break link layout */}
      <button
        ref={handleRef}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/menu-item:opacity-100 flex items-center justify-center cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-sidebar-accent/50"
        tabIndex={-1}
        aria-label="Przeciągnij, aby zmienić kolejność"
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </button>
      <SidebarMenuButton
        asChild
        tooltip={project.name}
        isActive={isActive}
      >
        <Link href={`/dashboard/projects/${project.id}`}>
          <ProjectIcon
            iconName={project.icon}
            color={project.color}
            className="w-4 h-4 flex-shrink-0"
          />
          <span className="truncate">{project.name}</span>
        </Link>
      </SidebarMenuButton>
      {todoCount > 0 && (
        <SidebarMenuBadge
          className="right-2.5 group-hover/menu-item:right-8 transition-all duration-200 font-semibold"
          style={badgeStyle}
        >
          {todoCount}
        </SidebarMenuBadge>
      )}
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
  )
}

export function NavProjects({ projects, onEditProject, onDeleteProject, onReorderProjects }: NavProjectsProps) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()
  const [showArchived, setShowArchived] = useState(false)
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([])
  const [archivedProjectsLoaded, setArchivedProjectsLoaded] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const activeProjects = projects.filter(project => !project.archived)
  const archivedProjectsFromProps = projects.filter(project => project.archived)

  const isProjectActive = (projectId: string) => {
    return pathname.startsWith(`/dashboard/projects/${projectId}`)
  }

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

  // Monitor drag-and-drop events for active projects
  useEffect(() => {
    if (!onReorderProjects) return

    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === "project",
      onDrop: ({ source, location }) => {
        const destination = location.current.dropTargets[0]
        if (!destination) return

        const sourceId = source.data.projectId as string
        const targetId = destination.data.projectId as string
        const edge = extractClosestEdge(destination.data)

        const currentIds = activeProjects.map(p => p.id)
        const newIds = reorderWithEdge(currentIds, sourceId, targetId, edge)

        if (JSON.stringify(newIds) !== JSON.stringify(currentIds)) {
          onReorderProjects(newIds)
        }
      },
    })
  }, [activeProjects, onReorderProjects])

  const displayedArchivedProjects = showArchived
    ? (archivedProjectsFromProps.length > 0 ? archivedProjectsFromProps : archivedProjects)
    : []

  const archivedCount = archivedProjectsFromProps.length > 0
    ? archivedProjectsFromProps.length
    : archivedProjects.length

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        if (onDeleteProject) {
          onDeleteProject(projectToDelete)
        }

        setArchivedProjects(prev => prev.filter(p => p.id !== projectToDelete.id))
        setDeleteDialogOpen(false)
        setProjectToDelete(null)
      } else {
        const errorData = await response.json()
        console.error("Failed to delete project:", errorData.error)
        alert("Nie udało się usunąć projektu. Spróbuj ponownie.")
      }
    } catch (error) {
      console.error("Error deleting project:", error)
      alert("Wystąpił błąd podczas usuwania projektu.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <SidebarGroup>
      {projects.length > 0 && <SidebarGroupLabel>Lista projektów</SidebarGroupLabel>}
      <SidebarMenu>
        {/* Aktywne projekty — sortowalne */}
        {activeProjects.map((project) => (
          <SortableProjectItem
            key={project.id}
            project={project}
            onEditProject={onEditProject}
            onDeleteProject={handleDeleteProject}
            isMobile={isMobile}
            isActive={isProjectActive(project.id)}
          />
        ))}

        {/* Przycisk "Zarchiwizowane" */}
        <SidebarMenuItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton
                onClick={() => setShowArchived(!showArchived)}
                className="cursor-pointer"
              >
                {showArchived ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>Zarchiwizowane</span>
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

        {/* Archiwizowane projekty */}
        {displayedArchivedProjects.map((project) => {
          const todoCount = project.tasks?.filter(task => {
            const statusName = task.taskStatus?.name?.toLowerCase()
            return statusName !== 'done'
          }).length || 0

          const badgeStyle = project.color
            ? { backgroundColor: `${project.color}10`, color: project.color, opacity: 0.6 }
            : { opacity: 0.6 }

          return (
            <SidebarMenuItem key={`archived-${project.id}`}>
              <SidebarMenuButton
                asChild
                tooltip={`${project.name} (zarchiwizowany)`}
                isActive={isProjectActive(project.id)}
              >
                <Link href={`/dashboard/projects/${project.id}`}>
                  <div className="opacity-60">
                    <ProjectIcon
                      iconName={project.icon}
                      color={project.color}
                      className="w-4 h-4 flex-shrink-0"
                    />
                  </div>
                  <span className="truncate opacity-60 pr-4">{project.name}</span>
                  <Archive className="h-3 w-3 ml-auto opacity-60 mr-4" />
                </Link>
              </SidebarMenuButton>
              {todoCount > 0 && (
                <SidebarMenuBadge
                  className="right-8 group-hover/menu-item:right-14 transition-all duration-200 font-semibold"
                  style={badgeStyle}
                >
                  {todoCount}
                </SidebarMenuBadge>
              )}
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
                  <DropdownMenuItem
                    onClick={() => handleDeleteProject(project)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń projekt
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć projekt?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Projekt {projectToDelete?.name} oraz wszystkie powiązane z nim dane
              (zadania, komentarze, załączniki, dokumenty) zostaną trwale usunięte z systemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Usuwanie..." : "Usuń projekt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  )
}
