"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Settings, GripVertical, Edit, Trash2 } from "lucide-react"
import { TaskStatusDialog } from "./task-status-dialog"
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

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  team: {
    id: string
    name: string
  }
}

interface ProjectSettingsContentProps {
  projectId: string
}

function SortableTaskStatus({
  status,
  onEdit,
  onDelete
}: {
  status: TaskStatus
  onEdit: (status: TaskStatus) => void
  onDelete: (status: TaskStatus) => void
}) {
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
                Default
              </Badge>
            )}
          </div>
          <span className="text-sm text-gray-500">Order: {status.order}</span>
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
          onClick={() => onDelete(status)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function ProjectSettingsContent({ projectId }: ProjectSettingsContentProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null)
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      } else if (response.status === 404) {
        router.push("/dashboard/projects")
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    }
  }

  const fetchTaskStatuses = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses`)
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
    fetchProject()
    fetchTaskStatuses()
  }, [projectId])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = taskStatuses.findIndex((status) => status.id === active.id)
      const newIndex = taskStatuses.findIndex((status) => status.id === over?.id)

      const newOrder = arrayMove(taskStatuses, oldIndex, newIndex)
      setTaskStatuses(newOrder)

      // Update order on server
      try {
        await fetch(`/api/projects/${projectId}/task-statuses/reorder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            statusIds: newOrder.map(status => status.id)
          }),
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

  const handleDeleteStatus = async (status: TaskStatus) => {
    if (!confirm(`Are you sure you want to delete the "${status.name}" status?`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/task-statuses/${status.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchTaskStatuses()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete status")
      }
    } catch (error) {
      console.error("Error deleting task status:", error)
      alert("An error occurred while deleting the status")
    }
  }

  const handleStatusSaved = () => {
    fetchTaskStatuses()
    setStatusDialogOpen(false)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!project) {
    return <div>Project not found</div>
  }

  return (
    <div id="page-header" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
            <p className="text-gray-500">{project.name}</p>
          </div>
        </div>
      </div>

      {/* Task Status Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Task Statuses</span>
              </CardTitle>
              <CardDescription>
                Configure custom task statuses for this project. Drag to reorder.
              </CardDescription>
            </div>
            <Button onClick={handleCreateStatus}>
              <Plus className="mr-2 h-4 w-4" />
              Add Status
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
              <p>No custom task statuses configured.</p>
              <p className="text-sm">Using default statuses: To Do, In Progress, Done</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onStatusSaved={handleStatusSaved}
        projectId={projectId}
        status={editingStatus}
      />
    </div>
  )
}
