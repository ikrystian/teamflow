"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"
import {
  Plus,
  Contact,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  StickyNote,
  Pencil,
  Trash2,
  MoreVertical,
  FolderOpen,
  Search,
} from "lucide-react"
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
import { usePageHeader } from "@/contexts/header-context"
import { ClientFormSheet } from "./client-form-sheet"
import { type Client } from "@/types"

export function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch("/api/clients")
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Error fetching clients:", error)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Wyczyść pointer-events na body po zamknięciu dialogu usuwania
  useEffect(() => {
    if (!deleteOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = ""
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [deleteOpen])

  const handleCreate = () => {
    setEditingClient(null)
    setFormOpen(true)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormOpen(true)
  }

  const handleDelete = (client: Client) => {
    setDeleteTarget(client)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/clients/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        await fetchClients()
        setDeleteOpen(false)
        setTimeout(() => setDeleteTarget(null), 100)
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.error || "Nie udało się usunąć klienta.")
      }
    } catch {
      alert("Wystąpił błąd podczas usuwania klienta.")
    } finally {
      setIsDeleting(false)
    }
  }

  usePageHeader(
    <div className="flex justify-between items-center w-full">
      <h1 className="text-2xl font-bold text-foreground">
        Klienci i dane kontaktowe
      </h1>
      <Button onClick={handleCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Dodaj klienta
      </Button>
    </div>,
    []
  )

  const term = search.trim().toLowerCase()
  const filtered = term
    ? clients.filter((c) =>
      [c.name, c.contactPerson, c.email, c.phone, c.taxId]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term))
    )
    : clients

  if (loading) {
    return <PageLoadingLayout variant="list" showTopBar={false} />
  }

  return (
    <div className="space-y-6 p-4 md:p-8 pt-6" id="client-content">
      {clients.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj klienta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Contact className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {clients.length === 0 ? "Brak klientów" : "Brak wyników"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {clients.length === 0
                ? "Dodaj pierwszego klienta, aby przechowywać dane kontaktowe i notatki."
                : "Żaden klient nie pasuje do wyszukiwania."}
            </p>
            {clients.length === 0 && (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj klienta
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((client) => (
            <Card key={client.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{client.name}</CardTitle>
                      {client.contactPerson && (
                        <p className="text-xs text-muted-foreground truncate">
                          {client.contactPerson}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(client)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edytuj
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(client)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3 text-sm">
                <div className="space-y-2">
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </a>
                  )}
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="truncate">{client.phone}</span>
                    </a>
                  )}
                  {client.website && (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Globe className="h-4 w-4 shrink-0" />
                      <span className="truncate">{client.website}</span>
                    </a>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                  {client.taxId && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">NIP: {client.taxId}</span>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <div className="flex gap-2 rounded-md bg-muted/50 p-2 text-muted-foreground">
                    <StickyNote className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="line-clamp-3 whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary" className="font-normal">
                    <FolderOpen className="mr-1 h-3 w-3" />
                    {client._count?.projects ?? client.projects?.length ?? 0}{" "}
                    {(client._count?.projects ?? client.projects?.length ?? 0) === 1
                      ? "projekt"
                      : "projekty/-ów"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchClients}
        client={editingClient}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć klienta?</AlertDialogTitle>
            <AlertDialogDescription>
              Klient {deleteTarget?.name} zostanie trwale usunięty. Powiązane projekty
              nie zostaną usunięte — zostaną jedynie odłączone od tego klienta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Usuwanie..." : "Usuń klienta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
