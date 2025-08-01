"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import {
  Users,
  Search,
  Edit,
  Trash2,
  Shield,
  User,
  Mail,
  Briefcase,
  Calendar,
  Activity,
  Loader2
} from "lucide-react"

interface UserData {
  id: string
  name: string | null
  email: string
  role: string
  avatarUrl: string | null
  jobTitle: string | null
  company: string | null
  phone: string | null
  location: string | null
  bio: string | null
  website: string | null
  createdAt: string
  updatedAt: string
  _count: {
    assignedTasks: number
    createdTasks: number
    teams: number
    comments?: number
    timeEntries?: number
  }
}

interface PaginationData {
  page: number
  limit: number
  total: number
  pages: number
}

export function UserManagement() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
    location: "",
    bio: "",
    jobTitle: "",
    company: "",
    website: "",
    password: ""
  })

  const fetchUsers = useCallback(async (page = 1, search = "") => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      if (search.trim()) {
        params.append("search", search.trim())
      }

      const response = await fetch(`/api/admin/users?${params}`)

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Błąd podczas pobierania użytkowników")
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = () => {
    fetchUsers(1, searchTerm)
  }

  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, searchTerm)
  }

  const openEditDialog = (user: UserData) => {
    setEditingUser(user)
    setEditForm({
      name: user.name || "",
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      location: user.location || "",
      bio: user.bio || "",
      jobTitle: user.jobTitle || "",
      company: user.company || "",
      website: user.website || "",
      password: ""
    })
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!editingUser) return

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update user")
      }

      toast.success("Użytkownik został zaktualizowany")
      setEditDialogOpen(false)
      setEditingUser(null)
      fetchUsers(pagination.page, searchTerm)
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error(error instanceof Error ? error.message : "Błąd podczas aktualizacji użytkownika")
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete user")
      }

      toast.success("Użytkownik został usunięty")
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      fetchUsers(pagination.page, searchTerm)
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error(error instanceof Error ? error.message : "Błąd podczas usuwania użytkownika")
    }
  }

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge variant="destructive" className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Administrator
      </Badge>
    ) : (
      <Badge variant="secondary" className="flex items-center gap-1">
        <User className="h-3 w-3" />
        Użytkownik
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Zarządzanie użytkownikami
        </CardTitle>
        <CardDescription>
          Zarządzaj kontami użytkowników, ich rolami i uprawnieniami
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Szukaj użytkowników..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} variant="outline">
            Szukaj
          </Button>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>
                        {user.name?.charAt(0) || user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{user.name || "Bez nazwy"}</h3>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                      {user.jobTitle && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {user.jobTitle}
                          {user.company && ` w ${user.company}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUserToDelete(user)}
                          disabled={user.id === session?.user?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usuń użytkownika</AlertDialogTitle>
                          <AlertDialogDescription>
                            Czy na pewno chcesz usunąć użytkownika {userToDelete?.name || userToDelete?.email}?
                            Ta akcja jest nieodwracalna.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteUser}>
                            Usuń
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* User Stats */}
                <div className="flex gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {user._count.assignedTasks} zadań
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {user._count.teams} zespołów
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nie znaleziono użytkowników
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Poprzednia
            </Button>
            <span className="flex items-center px-3 text-sm">
              Strona {pagination.page} z {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.pages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Następna
            </Button>
          </div>
        )}

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edytuj użytkownika</DialogTitle>
              <DialogDescription>
                Zmień dane użytkownika {editingUser?.name || editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Imię i nazwisko</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Rola</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
                    disabled={editingUser?.id === session?.user?.id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Użytkownik</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  {editingUser?.id === session?.user?.id && (
                    <p className="text-xs text-muted-foreground">
                      Nie możesz zmienić swojej własnej roli
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Stanowisko</Label>
                  <Input
                    id="jobTitle"
                    value={editForm.jobTitle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Firma</Label>
                  <Input
                    id="company"
                    value={editForm.company}
                    onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Lokalizacja</Label>
                  <Input
                    id="location"
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Strona internetowa</Label>
                  <Input
                    id="website"
                    value={editForm.website}
                    onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Nowe hasło (opcjonalne)</Label>
                <Input
                  id="password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Pozostaw puste, aby nie zmieniać"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleEditSubmit}>
                Zapisz zmiany
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
