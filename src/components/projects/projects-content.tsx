"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { Plus, FolderOpen, Calendar, Users, ImageIcon, Edit, MoreVertical, Archive, ArchiveX, Trash2, Contact } from "lucide-react"
import { CreateProjectSheet } from "./create-project-sheet"
import { EditProjectSheet } from "./edit-project-sheet"
import { usePageHeader } from "@/contexts/header-context"
import { PageHeader, PageBody } from "@/components/dashboard/page-header"
import { useProjects, useProjectsWithFilter } from "@/contexts/projects-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import Image from "next/image"
import { type Project } from "@/types"

type ProjectFilter = "active" | "archived" | "all"

export function ProjectsContent() {
  const { refreshProjects } = useProjects()
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("active")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Używamy hook do pobierania projektów z filtrowaniem
  const { projects } = useProjectsWithFilter(projectFilter)





  useEffect(() => {
    const fetchData = async () => {
      setLoading(false)
    }
    fetchData()
  }, [])

  // Cleanup body styles when delete dialog closes
  useEffect(() => {
    if (!deleteDialogOpen) {
      // Remove pointer-events: none from body when dialog closes
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = ''
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [deleteDialogOpen])

  const handleProjectCreated = () => {
    refreshProjects()
    setCreateDialogOpen(false)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setEditDialogOpen(true)
  }

  const handleProjectUpdated = () => {
    setEditDialogOpen(false)
    setSelectedProject(null)
    refreshProjects()
  }

  const handleArchiveProject = async (project: Project) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/archive`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          archived: !project.archived
        }),
      })

      if (response.ok) {
        refreshProjects()
      } else {
        console.error("Failed to archive/unarchive project")
      }
    } catch (error) {
      console.error("Error archiving/unarchiving project:", error)
    }
  }

  const handleFilterChange = (filter: ProjectFilter) => {
    setProjectFilter(filter)
    // useProjectsWithFilter automatycznie pobierze projekty z nowym filtrem
  }

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
        refreshProjects()
        setDeleteDialogOpen(false)
        // Delay resetting state to allow dialog to close properly and clean up body styles
        setTimeout(() => {
          setProjectToDelete(null)
        }, 100)
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

  // Set page header content
  usePageHeader(
    <PageHeader
      title="Projekty"
      description="Zarządzaj swoimi projektami i śledź postępy"
      actions={
      <>
        <Select value={projectFilter} onValueChange={handleFilterChange}>
          <SelectTrigger size="sm" className="w-44 max-sm:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktywne projekty</SelectItem>
            <SelectItem value="archived">Zarchiwizowane projekty</SelectItem>
            <SelectItem value="all">Wszystkie projekty</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus />
          <span className="hidden sm:inline">Utwórz projekt</span>
        </Button>
      </>
      }
    />,
    [projectFilter]
  )

  const getFilteredProjects = () => {
    switch (projectFilter) {
      case "active":
        return projects.filter(project => !project.archived)
      case "archived":
        return projects.filter(project => project.archived)
      case "all":
        return projects
      default:
        return projects.filter(project => !project.archived)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"
      case "In Progress":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
      case "On Hold":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getTaskStats = (tasks: Project["tasks"]) => {
    if (!tasks) {
      return { total: 0, completed: 0, inProgress: 0 }
    }
    const total = tasks.length
    const statusOf = (task: (typeof tasks)[number]) => task.taskStatus?.name?.toLowerCase()
    const completed = tasks.filter(task => statusOf(task) === "done").length
    const inProgress = tasks.filter(task => statusOf(task) === "in progress").length
    return { total, completed, inProgress }
  }

  if (loading) {
    return <PageLoadingLayout variant="list" showTopBar={false} />
  }

  return (
    <PageBody>
    <div id="project-content">
      {getFilteredProjects().length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
              <FolderOpen className="size-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {projectFilter === "archived" ? "Brak zarchiwizowanych projektów" :
                projectFilter === "all" ? "Brak projektów" : "Brak aktywnych projektów"}
            </h3>
            <p className="text-[13px] text-muted-foreground text-center mb-4">
              {projectFilter === "archived" ? "Nie masz żadnych zarchiwizowanych projektów" :
                "Utwórz swój pierwszy projekt, aby rozpocząć organizowanie zadań i współpracę"}
            </p>
            {projectFilter !== "archived" && (
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus />
                Utwórz projekt
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {getFilteredProjects().map((project) => {
            const stats = getTaskStats(project.tasks)
            return (
              <Card
                key={project.id}
                className={`group gap-0 overflow-hidden relative py-0 hover-card-border-animate ${project.archived ? 'opacity-60 bg-muted/30' : ''}`}
                style={{ '--hover-border-color': project.color || 'var(--primary)' } as React.CSSProperties}
              >
                {/* Edit Button */}
                <div className="absolute top-2 right-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 bg-background/80 hover:bg-background/95 backdrop-blur-sm open-project-menu opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditProject(project)}>
                        <Edit className="mr-2 h-4 w-4 " />
                        Edytuj projekt
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchiveProject(project)}>
                        {project.archived ? (
                          <>
                            <ArchiveX className="mr-2 h-4 w-4" />
                            Przywróć projekt
                          </>
                        ) : (
                          <>
                            <Archive className="mr-2 h-4 w-4" />
                            Archiwizuj projekt
                          </>
                        )}
                      </DropdownMenuItem>
                      {project.archived && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Usuń projekt
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Link href={`/dashboard/projects/${project.id}`} className="block">
                  {/* Project Image */}
                  <div className="relative h-36 bg-muted cursor-pointer border-b">
                    {project.imageUrl ? (
                      <Image
                        src={project.imageUrl}
                        alt={project.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center h-full"
                        style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${project.color || 'var(--primary)'} 22%, transparent), transparent)` }}
                      >
                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color || 'var(--primary)' }} />
                          <h3 className="truncate text-sm font-semibold tracking-tight">{project.name}</h3>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {project.archived && (
                            <Badge variant="secondary" className="text-[11px]">
                              <Archive className="h-3 w-3" />
                              Archiwum
                            </Badge>
                          )}
                          {project.status && (
                            <Badge variant="outline" className={`text-[11px] ${getStatusColor(project.status)}`}>
                              {project.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">
                        {project.description || "Brak opisu"}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Postęp</span>
                        <span className="font-medium tabular-nums">
                          {stats.completed}/{stats.total}
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%',
                            backgroundColor: project.color || 'var(--primary)',
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {project.client ? (
                          <>
                            <Contact className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{project.client.name}</span>
                          </>
                        ) : (
                          <>
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Projekt osobisty</span>
                          </>
                        )}
                      </span>
                      {project.createdAt && (
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(project.createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </Card>
            )
          })}
        </div>
      )}

      <CreateProjectSheet
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProjectCreated={handleProjectCreated}
      />

      <EditProjectSheet
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProjectUpdated={handleProjectUpdated}
        project={selectedProject}
      />

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
    </div>
    </PageBody>
  )
}
