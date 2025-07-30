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
  DragStartEvent,
  DragOverlay,
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
import { toast } from "sonner"
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
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm transition-all duration-200 ${
        isDragging ? 'shadow-lg scale-105' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 transition-colors"
          title="Przeciągnij, aby zmienić kolejność"
        >
          <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
        </div>

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
          title="Edytuj status"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(status.id)}
          title="Usuń status"
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
  const [activeStatus, setActiveStatus] = useState<TaskStatus | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const status = taskStatuses.find(s => s.id === active.id)
    setActiveStatus(status || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveStatus(null)

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = taskStatuses.findIndex((status) => status.id === active.id)
    const newIndex = taskStatuses.findIndex((status) => status.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      console.error("Invalid drag operation: status not found")
      return
    }

    const newTaskStatuses = arrayMove(taskStatuses, oldIndex, newIndex)

    // Optimistic update
    setTaskStatuses(newTaskStatuses)
    setIsReordering(true)

    // Update order on server
    try {
      const statusIds = newTaskStatuses.map(status => status.id)
      const response = await fetch("/api/system/task-statuses/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statusIds }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to reorder statuses")
      }

      // Update the order values in the local state to match server
      const updatedStatuses = newTaskStatuses.map((status, index) => ({
        ...status,
        order: index
      }))
      setTaskStatuses(updatedStatuses)
      toast.success("Kolejność statusów została zaktualizowana")
    } catch (error) {
      console.error("Error reordering task statuses:", error)
      toast.error("Nie udało się zaktualizować kolejności statusów")
      // Revert on error
      fetchTaskStatuses()
    } finally {
      setIsReordering(false)
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
                {isReordering && (
                  <span className="text-blue-600 ml-2">Zapisywanie nowej kolejności...</span>
                )}
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
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={taskStatuses.map(status => status.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={`space-y-3 transition-all duration-200 ${
                activeStatus ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4' : ''
              }`}>
                {taskStatuses.length > 0 ? (
                  taskStatuses.map((status) => (
                    <SortableTaskStatus
                      key={status.id}
                      status={status}
                      onEdit={handleEditStatus}
                      onDelete={handleDeleteStatus}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>Brak statusów zadań. Dodaj pierwszy status.</p>
                  </div>
                )}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeStatus ? (
                <div className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-lg opacity-90 rotate-2">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{activeStatus.name}</span>
                        {activeStatus.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Domyślny
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">Kolejność: {activeStatus.order}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
