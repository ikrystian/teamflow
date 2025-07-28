"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Settings, GripVertical, Edit, Trash2 } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { SystemTaskStatusDialog } from "./system-task-status-dialog"
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

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface SortableTaskStatusProps {
  status: TaskStatus
  onEdit: (status: TaskStatus) => void
  onDelete: (statusId: string) => void
}

function SortableTaskStatus({ status, onEdit, onDelete }: SortableTaskStatusProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm"
    >
      <div className="flex items-center space-x-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{status.name}</span>
            {status.isDefault && (
              <Badge variant="secondary" className="text-xs">
                Domyślny
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">Kolejność: {status.order}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(status)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(status.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function SystemTaskStatuses() {
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statusToDelete, setStatusToDelete] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchTaskStatuses = async () => {
    try {
      const response = await fetch("/api/system/task-statuses")
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaskStatuses()
  }, [])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = taskStatuses.findIndex((status) => status.id === active.id)
      const newIndex = taskStatuses.findIndex((status) => status.id === over?.id)

      const newTaskStatuses = arrayMove(taskStatuses, oldIndex, newIndex)
      setTaskStatuses(newTaskStatuses)

      // Update order on server
      try {
        const statusIds = newTaskStatuses.map(status => status.id)
        await fetch("/api/system/task-statuses/reorder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ statusIds }),
        })
      } catch (error) {
        console.error("Error reordering task statuses:", error)
        // Revert on error
        fetchTaskStatuses()
      }
    }
  }

  const handleCreateStatus = () => {
    setEditingStatus(null)
    setStatusDialogOpen(true)
  }

  const handleEditStatus = (status: TaskStatus) => {
    setEditingStatus(status)
    setStatusDialogOpen(true)
  }

  const handleDeleteStatus = (statusId: string) => {
    setStatusToDelete(statusId)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteStatus = async () => {
    if (!statusToDelete) return

    try {
      const response = await fetch(`/api/system/task-statuses/${statusToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchTaskStatuses()
      } else {
        const data = await response.json()
        alert(data.error || "Nie udało się usunąć statusu")
      }
    } catch (error) {
      console.error("Error deleting task status:", error)
      alert("Wystąpił błąd podczas usuwania statusu")
    } finally {
      setDeleteDialogOpen(false)
      setStatusToDelete(null)
    }
  }

  const handleStatusSaved = () => {
    fetchTaskStatuses()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p>Ładowanie statusów zadań...</p>
          </div>
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
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Statusy zadań</span>
              </CardTitle>
              <CardDescription>
                Zarządzaj globalnymi statusami zadań używanymi we wszystkich projektach. Przeciągnij, aby zmienić kolejność.
              </CardDescription>
            </div>
            <Button onClick={handleCreateStatus}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={taskStatuses.map(status => status.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {taskStatuses.map((status) => (
                  <SortableTaskStatus
                    key={status.id}
                    status={status}
                    onEdit={handleEditStatus}
                    onDelete={handleDeleteStatus}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {taskStatuses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Settings className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>Brak statusów zadań. Dodaj pierwszy status.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <SystemTaskStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onStatusSaved={handleStatusSaved}
        status={editingStatus}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń status zadania</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć ten status? Ta akcja jest nieodwracalna.
              Status nie może być usunięty jeśli jest używany przez jakiekolwiek zadania.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStatus}>
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
