"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Settings, GripVertical, Edit, Trash2 } from "lucide-react"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { DropIndicator } from "@/components/ui/drop-indicator"
import { reorderWithEdge, type Edge } from "@/lib/dnd-utils"
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
  const ref = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)

  useEffect(() => {
    const element = ref.current
    const handle = handleRef.current
    if (!element || !handle) return

    return combine(
      draggable({
        element,
        dragHandle: handle,
        getInitialData: () => ({ type: "task-status", statusId: status.id }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => source.data.type === "task-status",
        getData: ({ input, element }) =>
          attachClosestEdge(
            { statusId: status.id },
            { input, element, allowedEdges: ["top", "bottom"] }
          ),
        onDrag: ({ self, source }) => {
          if (source.data.statusId === status.id) {
            setClosestEdge(null)
            return
          }
          setClosestEdge(extractClosestEdge(self.data))
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      })
    )
  }, [status.id])

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className={`relative flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm transition-all duration-200 ${
        isDragging ? 'shadow-lg scale-105' : 'hover:shadow-md'
      }`}
    >
      {closestEdge && <DropIndicator edge={closestEdge} />}
      <div className="flex items-center space-x-3">
        <div
          ref={handleRef}
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
  const [isReordering, setIsReordering] = useState(false)

  // Keep latest statuses accessible inside the drag monitor without
  // re-registering it on every render.
  const statusesRef = useRef<TaskStatus[]>(taskStatuses)
  statusesRef.current = taskStatuses

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

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === "task-status",
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return

        const sourceId = source.data.statusId as string
        const targetId = target.data.statusId as string
        if (sourceId === targetId) return

        const edge = extractClosestEdge(target.data)
        const current = statusesRef.current
        const orderedIds = reorderWithEdge(
          current.map((status) => status.id),
          sourceId,
          targetId,
          edge
        )

        const newTaskStatuses = orderedIds
          .map((id) => current.find((status) => status.id === id))
          .filter((status): status is TaskStatus => status !== undefined)

        handleReorder(newTaskStatuses)
      },
    })
  }, [])

  const handleReorder = async (newTaskStatuses: TaskStatus[]) => {
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
          <div className="space-y-3">
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
