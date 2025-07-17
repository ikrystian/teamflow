"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import { Plus, Users, Settings } from "lucide-react"
import { CreateTeamDialog } from "./create-team-dialog"
import { EditTeamDialog } from "./edit-team-dialog"

interface Team {
  id: string
  name: string
  createdAt: string
  members: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }[]
  projects: {
    id: string
    name: string
    status: string
  }[]
}

export function TeamsContent() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams")
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams)
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  const handleTeamCreated = () => {
    fetchTeams()
    setCreateDialogOpen(false)
  }

  const handleTeamUpdated = () => {
    fetchTeams()
    setEditDialogOpen(false)
    setSelectedTeam(null)
  }

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team)
    setEditDialogOpen(true)
  }

  if (loading) {
    return <PageLoadingLayout variant="list" showTopBar={false} />
  }

  return (
        <div>
              {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div id="dynamic-header" className="flex flex-1" >
      <div id="page-header"  className="flex justify-between items-center  w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-500">Manage your teams and collaborate with others</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
    <div className="space-y-6">


      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
            <p className="text-gray-500 text-center mb-4">
              Create your first team to start collaborating with others
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditTeam(team)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Members</span>
                      <Badge variant="secondary">{team.members.length}</Badge>
                    </div>
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 5).map((member) => (
                        <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback className="text-xs">
                            {member.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {team.members.length > 5 && (
                        <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            +{team.members.length - 5}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Projects</span>
                      <Badge variant="secondary">{team.projects.length}</Badge>
                    </div>
                    {team.projects.length > 0 ? (
                      <div className="space-y-1">
                        {team.projects.slice(0, 3).map((project) => (
                          <div key={project.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 truncate">{project.name}</span>
                            <Badge
                              variant={project.status === "Completed" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {project.status}
                            </Badge>
                          </div>
                        ))}
                        {team.projects.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{team.projects.length - 3} more projects
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No projects yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTeamCreated={handleTeamCreated}
      />

      <EditTeamDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onTeamUpdated={handleTeamUpdated}
        team={selectedTeam}
      />
    </div>
    </div>
    </main>
    </div>
  )
}
