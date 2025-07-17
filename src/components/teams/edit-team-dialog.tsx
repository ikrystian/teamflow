"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, X, Plus, Users } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface Team {
  id: string
  name: string
  createdAt: string
  members: User[]
  projects: {
    id: string
    name: string
    status: string
  }[]
}

interface EditTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTeamUpdated: () => void
  team: Team | null
}

export function EditTeamDialog({ open, onOpenChange, onTeamUpdated, team }: EditTeamDialogProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Fetch all users
  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setAllUsers(data.users)
      }
    } catch (error) {
      console.error("Błąd podczas pobierania użytkowników:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Update form when team changes
  useEffect(() => {
    if (team) {
      setName(team.name)
      setSelectedMembers(team.members)
    } else {
      setName("")
      setSelectedMembers([])
    }
    setError("")
  }, [team])

  // Fetch users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const addMember = (user: User) => {
    if (!selectedMembers.find(member => member.id === user.id)) {
      setSelectedMembers([...selectedMembers, user])
    }
  }

  const removeMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== userId))
  }

  const filteredUsers = allUsers.filter(user =>
    !selectedMembers.find(member => member.id === user.id) &&
    (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team) return

    setLoading(true)
    setError("")

    try {
      const memberIds = selectedMembers.map(member => member.id)
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          memberIds
        }),
      })

      if (response.ok) {
        onTeamUpdated()
        handleClose()
      } else {
        const data = await response.json()
        setError(data.error || "Nie udało się zaktualizować zespołu")
      }
    } catch (error) {
      setError("Wystąpił błąd. Spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    setSearchQuery("")
    onOpenChange(false)
  }

  const hasChanges = team && (
    name.trim() !== team.name ||
    selectedMembers.length !== team.members.length ||
    selectedMembers.some(member => !team.members.find(m => m.id === member.id))
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj zespół</DialogTitle>
          <DialogDescription>
            Zaktualizuj nazwę zespołu i zarządzaj członkami zespołu. Zmiany będą widoczne dla wszystkich członków zespołu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Team Name Section */}
            <div className="grid gap-2">
              <Label htmlFor="name">Nazwa zespołu</Label>
              <Input
                id="name"
                placeholder="Wprowadź nazwę zespołu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Team Members Section */}
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <Label>Członkowie zespołu ({selectedMembers.length})</Label>
              </div>

              {/* Current Members */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Obecni członkowie:</div>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-gray-50">
                  {selectedMembers.length > 0 ? (
                    selectedMembers.map((member) => (
                      <Badge
                        key={member.id}
                        variant="secondary"
                        className="flex items-center gap-2 pr-1"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback className="text-xs">
                            {member.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{member.name || member.email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-red-100"
                          onClick={() => removeMember(member.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">Nie wybrano członków</div>
                  )}
                </div>
              </div>

              {/* Add Members */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Dodaj członków:</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Szukaj użytkowników po nazwie lub adresie e-mail..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {loadingUsers ? (
                  <div className="text-sm text-gray-500 p-2">Ładowanie użytkowników...</div>
                ) : (
                  <div className="max-h-32 overflow-y-auto border rounded-md">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.slice(0, 10).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => addMember(user)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatarUrl} alt={user.name} />
                              <AvatarFallback className="text-xs">
                                {user.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{user.name || "Brak nazwy"}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : searchQuery ? (
                      <div className="text-sm text-gray-500 p-2">Nie znaleziono użytkowników pasujących do "{searchQuery}"</div>
                    ) : (
                      <div className="text-sm text-gray-500 p-2">Wszyscy użytkownicy są już członkami</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim() || !hasChanges || selectedMembers.length === 0}
            >
              { }
              {loading ? 'Aktualizowanie&hellip;' : 'Zaktualizuj zesp&oacute;&#322;'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
