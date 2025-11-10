"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { Plus, FolderOpen, Calendar, Users, ImageIcon, Edit, MoreVertical, Archive, ArchiveX, Trash2 } from "lucide-react"
import { CreateProjectSheet } from "./create-project-sheet"
import { EditProjectSheet } from "./edit-project-sheet"
import { usePageHeader } from "@/contexts/header-context"
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

interface Team {
  id: string
  name: string
}

type ProjectFilter = "active" | "archived" | "all"

export function ProjectsContent() {
  const { refreshProjects } = useProjects()
  const [teams, setTeams] = useState<Team[]>([])
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



  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch("/api/teams")
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams)
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      await fetchTeams()
      setLoading(false)
    }
    fetchData()
  }, [fetchTeams])

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

  // Set page header content
  usePageHeader(
    <div className="flex justify-between items-center w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Zarządzaj swoimi projektami i śledź postępy</h1>
      </div>
      <div className="flex items-center gap-4">
        <Select value={projectFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktywne projekty</SelectItem>
            <SelectItem value="archived">Zarchiwizowane projekty</SelectItem>
            <SelectItem value="all">Wszystkie projekty</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Utwórz projekt
        </Button>
      </div>
    </div>,
    [projectFilter, teams.length] // Only re-render when filter or teams count changes
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
        return "bg-green-100 text-green-800"
      case "In Progress":
        return "bg-blue-100 text-blue-800"
      case "On Hold":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTaskStats = (tasks: Project["tasks"]) => {
    if (!tasks) {
      return { total: 0, completed: 0, inProgress: 0 }
    }
    const total = tasks.length
    // TODO: Update to use statusId with proper status lookup
    const completed = 0 // tasks.filter(task => task.statusId === "done-status-id").length
    const inProgress = 0 // tasks.filter(task => task.statusId === "in-progress-status-id").length
    return { total, completed, inProgress }
  }

  if (loading) {
    return <PageLoadingLayout variant="list" showTopBar={false} />
  }

  return (
    <div className="space-y-6 p-4 md:p-8 pt-6">


      {getFilteredProjects().length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {projectFilter === "archived" ? "Brak zarchiwizowanych projektów" :
               projectFilter === "all" ? "Brak projektów" : "Brak aktywnych projektów"}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {projectFilter === "archived" ? "Nie masz żadnych zarchiwizowanych projektów" :
               "Utwórz swój pierwszy projekt, aby rozpocząć organizowanie zadań i współpracę"}
            </p>
            {projectFilter !== "archived" && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Utwórz projekt
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getFilteredProjects().map((project) => {
            const stats = getTaskStats(project.tasks)
            return (
              <Card key={project.id} className={`hover:shadow-md transition-shadow overflow-hidden relative pt-0 ${
                project.archived ? 'opacity-60 bg-muted/30' : ''
              }`}>
                {/* Edit Button */}
                <div className="absolute top-2 right-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/80 hover:bg-white/90 backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditProject(project)}>
                        <Edit className="mr-2 h-4 w-4" />
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
                  <div className="relative h-48 bg-muted cursor-pointer">
                    {project.imageUrl ? (
                      <Image
                        src={project.imageUrl}
                        alt={project.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <CardHeader className="pt-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {project.archived && (
                          <Badge variant="secondary" className="text-xs">
                            <Archive className="mr-1 h-3 w-3" />
                            Zarchiwizowany
                          </Badge>
                        )}
                        {project.status && (
                          <Badge className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {project.description || "Brak opisu"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {project.team ? project.team?.name : (project.createdBy ? `Projekt osobisty (${project.createdBy.name || project.createdBy.email})` : 'Projekt osobisty')}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Postęp zadań</span>
                          <span className="font-medium">
                            {stats.completed}/{stats.total}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%'
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{stats.completed} ukończono</span>
                          <span>{stats.inProgress} w toku</span>
                        </div>
                      </div>

                      {project.createdAt && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          Utworzono {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
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
        teams={teams}
      />

      <EditProjectSheet
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProjectUpdated={handleProjectUpdated}
        project={selectedProject}
        teams={teams}
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
  )
}
