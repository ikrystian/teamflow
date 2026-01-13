"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { Tag, Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface TagData {
    id: string
    name: string
    color: string
    taskCount: number
    createdAt: string
    updatedAt: string
}

const DEFAULT_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e", "#6b7280"
]

export function TagsManagement() {
    const [tags, setTags] = useState<TagData[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingTag, setEditingTag] = useState<TagData | null>(null)
    const [tagToDelete, setTagToDelete] = useState<TagData | null>(null)

    // Form state
    const [name, setName] = useState("")
    const [color, setColor] = useState("#6b7280")

    useEffect(() => {
        fetchTags()
    }, [])

    const fetchTags = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/tags")
            if (response.ok) {
                const data = await response.json()
                setTags(data.tags)
            }
        } catch (error) {
            console.error("Error fetching tags:", error)
            toast.error("Nie udało się pobrać tagów")
        } finally {
            setLoading(false)
        }
    }

    const openCreateDialog = () => {
        setEditingTag(null)
        setName("")
        setColor("#6b7280")
        setDialogOpen(true)
    }

    const openEditDialog = (tag: TagData) => {
        setEditingTag(tag)
        setName(tag.name)
        setColor(tag.color)
        setDialogOpen(true)
    }

    const openDeleteDialog = (tag: TagData) => {
        setTagToDelete(tag)
        setDeleteDialogOpen(true)
    }

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Nazwa tagu jest wymagana")
            return
        }

        setSaving(true)
        try {
            const url = editingTag ? `/api/tags/${editingTag.id}` : "/api/tags"
            const method = editingTag ? "PATCH" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), color })
            })

            if (response.ok) {
                toast.success(editingTag ? "Tag zaktualizowany" : "Tag utworzony")
                setDialogOpen(false)
                fetchTags()
            } else {
                const data = await response.json()
                toast.error(data.error || "Operacja nie powiodła się")
            }
        } catch (error) {
            console.error("Error saving tag:", error)
            toast.error("Wystąpił błąd")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!tagToDelete) return

        try {
            const response = await fetch(`/api/tags/${tagToDelete.id}`, {
                method: "DELETE"
            })

            if (response.ok) {
                toast.success("Tag usunięty")
                setDeleteDialogOpen(false)
                setTagToDelete(null)
                fetchTags()
            } else {
                const data = await response.json()
                toast.error(data.error || "Nie udało się usunąć tagu")
            }
        } catch (error) {
            console.error("Error deleting tag:", error)
            toast.error("Wystąpił błąd")
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Tag className="h-5 w-5" />
                                Zarządzanie tagami
                            </CardTitle>
                            <CardDescription>
                                Tagi są globalne i współdzielone między wszystkimi projektami
                            </CardDescription>
                        </div>
                        <Button onClick={openCreateDialog} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Dodaj tag
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {tags.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Brak tagów. Utwórz pierwszy tag, aby rozpocząć.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {tags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="font-medium">{tag.name}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {tag.taskCount} {tag.taskCount === 1 ? "zadanie" : tag.taskCount < 5 ? "zadania" : "zadań"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(tag)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openDeleteDialog(tag)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTag ? "Edytuj tag" : "Utwórz nowy tag"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTag
                                ? "Zmień nazwę lub kolor tagu"
                                : "Dodaj nowy tag, który będzie dostępny we wszystkich projektach"
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="tagName">Nazwa tagu</Label>
                            <Input
                                id="tagName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="np. Bug, Feature, Urgent..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Kolor</Label>
                            <div className="flex flex-wrap gap-2">
                                {DEFAULT_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <Label htmlFor="customColor" className="text-sm text-muted-foreground">
                                    Własny kolor:
                                </Label>
                                <Input
                                    id="customColor"
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-12 h-8 p-0 border-0 cursor-pointer"
                                />
                                <span className="text-sm font-mono text-muted-foreground">{color}</span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Label className="text-sm text-muted-foreground">Podgląd</Label>
                            <div className="mt-2">
                                <Badge
                                    style={{
                                        backgroundColor: `${color}20`,
                                        color: color,
                                        borderColor: color
                                    }}
                                    variant="outline"
                                    className="text-sm"
                                >
                                    {name || "Nazwa tagu"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Anuluj
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !name.trim()}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Zapisywanie...
                                </>
                            ) : (
                                editingTag ? "Zapisz zmiany" : "Utwórz tag"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć tag?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tag &quot;{tagToDelete?.name}&quot; zostanie usunięty ze wszystkich zadań.
                            Ta akcja jest nieodwracalna.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Usuń tag
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
