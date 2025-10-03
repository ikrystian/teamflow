"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Users, Plus, Search, Crown, Eye, User, Trash2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface ProjectMember {
  id: string
  role: string
  addedAt: string
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
}

interface User {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface ProjectMembersManagerProps {
  projectId: string
  createdById: string
  currentUserId: string
}

const roleLabels = {
  admin: { label: "Administrator", icon: Crown, color: "bg-red-100 text-red-800" },
  member: { label: "Członek", icon: User, color: "bg-blue-100 text-blue-800" },
  viewer: { label: "Obserwator", icon: Eye, color: "bg-gray-100 text-gray-800" }
}

export function ProjectMembersManager({
  projectId,
  createdById,
  currentUserId
}: ProjectMembersManagerProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState("member")
  const [adding, setAdding] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const isCurrentUserAdmin = members.find(m => m.user.id === currentUserId)?.role === "admin" || createdById === currentUserId

  // Fetch project members
  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members)
      } else {
        toast.error("Nie udało się pobrać członków projektu")
      }
    } catch (error) {
      console.error("Error fetching members:", error)
      toast.error("Wystąpił błąd podczas pobierania członków")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}&projectId=${projectId}`
      )
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users)
      }
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setSearchLoading(false)
    }
  }, [projectId])

  // Add member
  const addMember = async () => {
    if (!selectedUser) return

    setAdding(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: selectedRole
        })
      })

      if (response.ok) {
        toast.success("Członek został dodany do projektu")
        setSelectedUser(null)
        setSearchQuery("")
        setSearchResults([])
        setPopoverOpen(false)
        fetchMembers()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się dodać członka")
      }
    } catch (error) {
      console.error("Error adding member:", error)
      toast.error("Wystąpił błąd podczas dodawania członka")
    } finally {
      setAdding(false)
    }
  }

  // Update member role
  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        toast.success("Rola członka została zaktualizowana")
        fetchMembers()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się zaktualizować roli")
      }
    } catch (error) {
      console.error("Error updating member role:", error)
      toast.error("Wystąpił błąd podczas aktualizacji roli")
    }
  }

  // Remove member
  const removeMember = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/members?userId=${userId}`,
        { method: "DELETE" }
      )

      if (response.ok) {
        toast.success("Członek został usunięty z projektu")
        fetchMembers()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się usunąć członka")
      }
    } catch (error) {
      console.error("Error removing member:", error)
      toast.error("Wystąpił błąd podczas usuwania członka")
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [projectId, fetchMembers])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchUsers])

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return <div>Ładowanie członków...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Członkowie projektu</span>
        </CardTitle>
        <CardDescription>
          Zarządzaj dostępem użytkowników do projektu. Tylko administratorzy mogą dodawać i usuwać członków.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Add member section */}
          {isCurrentUserAdmin && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-4">Dodaj członka do projektu</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Wyszukaj użytkownika</Label>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={popoverOpen}
                        className="w-full justify-between"
                      >
                        {selectedUser ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={selectedUser.avatarUrl || ""} />
                              <AvatarFallback className="text-xs">
                                {getUserInitials(selectedUser.name, selectedUser.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{selectedUser.name || selectedUser.email}</span>
                          </div>
                        ) : (
                          "Wybierz użytkownika..."
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Wyszukaj użytkownika po nazwie lub email..."
                          value={searchQuery}
                          onValueChange={setSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {searchLoading ? "Wyszukiwanie..." : "Nie znaleziono użytkowników."}
                          </CommandEmpty>
                          <CommandGroup>
                            {searchResults.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={user.id}
                                onSelect={() => {
                                  setSelectedUser(user)
                                  setPopoverOpen(false)
                                }}
                              >
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.avatarUrl || ""} />
                                    <AvatarFallback className="text-xs">
                                      {getUserInitials(user.name, user.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {user.name || user.email}
                                    </span>
                                    {user.name && (
                                      <span className="text-xs text-muted-foreground">
                                        {user.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <CheckCircle
                                  className={`ml-auto h-4 w-4 ${
                                    selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Rola</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Obserwator - może tylko przeglądać</SelectItem>
                      <SelectItem value="member">Członek - może edytować zadania</SelectItem>
                      <SelectItem value="admin">Administrator - pełny dostęp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={addMember}
                  disabled={!selectedUser || adding}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {adding ? "Dodawanie..." : "Dodaj do projektu"}
                </Button>
              </div>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              Członkowie projektu ({members.length})
            </h4>

            {members.map((member) => {
              const roleInfo = roleLabels[member.role as keyof typeof roleLabels]
              const RoleIcon = roleInfo?.icon || User
              const isCreator = member.user.id === createdById

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-background"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user.avatarUrl || ""} />
                      <AvatarFallback>
                        {getUserInitials(member.user.name, member.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {member.user.name || member.user.email}
                        </span>
                        {isCreator && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="mr-1 h-3 w-3" />
                            Właściciel
                          </Badge>
                        )}
                      </div>
                      {member.user.name && (
                        <span className="text-sm text-muted-foreground">
                          {member.user.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge className={roleInfo?.color}>
                      <RoleIcon className="mr-1 h-3 w-3" />
                      {roleInfo?.label}
                    </Badge>

                    {isCurrentUserAdmin && !isCreator && (
                      <div className="flex items-center space-x-1">
                        <Select
                          value={member.role}
                          onValueChange={(role) => updateMemberRole(member.id, role)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Obserwator</SelectItem>
                            <SelectItem value="member">Członek</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMember(member.user.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {members.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak członków projektu</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}