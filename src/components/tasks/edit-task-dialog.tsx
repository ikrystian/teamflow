"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { ImageGallery } from "@/components/ui/image-gallery"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
}

interface TaskImage {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  statusId?: string
  priority?: string
  dueDate?: string
  estimatedHours?: number
  createdAt: string
  project: {
    id: string
    name: string
    team: {
      id: string
      name: string
    }
  }
  assignee?: User
  createdBy: User
  subtasks: {
    id: string
    title: string
    isCompleted: boolean
  }[]
  comments: {
    id: string
    content: string
    createdAt: string
    author: {
      id: string
      name: string
      avatarUrl?: string
    }
  }[]
  timeEntries: {
    id: string
    hours: number
    description?: string
    date: string
    user: User
  }[]
  images: TaskImage[]
}

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated: () => void
  task: Task | null
  teamMembers: User[]
}

export function EditTaskDialog({
  open,
  onOpenChange,
  onTaskUpdated,
  task,
  teamMembers
}: EditTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("")
  const [statusId, setStatusId] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [priority, setPriority] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [images, setImages] = useState<TaskImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchTaskStatuses = async () => {
    if (!task?.project?.id) return

    try {
      const response = await fetch(`/api/projects/${task.project.id}/task-statuses`)
      if (response.ok) {
        const data = await response.json()
        setTaskStatuses(data.taskStatuses)
        
        // After loading task statuses, ensure the current task's status is properly set
        if (task && data.taskStatuses.length > 0) {
          if (task.statusId) {
            // If task has a statusId, use it
            setStatusId(task.statusId)
            const matchingStatus = data.taskStatuses.find((s: TaskStatus) => s.id === task.statusId)
            if (matchingStatus) {
              setStatus(matchingStatus.name)
            }
          } else if (task.status) {
            // If task only has old status field, try to find matching status by name
            const matchingStatus = data.taskStatuses.find((s: TaskStatus) => s.name === task.status)
            if (matchingStatus) {
              setStatusId(matchingStatus.id)
              setStatus(matchingStatus.name)
            }
          } else {
            // If no status set, use the default status
            const defaultStatus = data.taskStatuses.find((s: TaskStatus) => s.isDefault)
            if (defaultStatus) {
              setStatusId(defaultStatus.id)
              setStatus(defaultStatus.name)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching task statuses:", error)
    }
  }

  // Update form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
      setImages(task.images || [])
      // Don't set status values here - they will be set properly after task statuses are loaded
      setAssigneeId(task.assignee?.id || "unassigned")
      setPriority(task.priority || "")
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : "")
      setEstimatedHours(task.estimatedHours ? task.estimatedHours.toString() : "none")
      fetchTaskStatuses()
    } else {
      resetForm()
    }
    setError("")
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          statusId: statusId || undefined,
          assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
          priority: priority || undefined,
          dueDate: dueDate || undefined,
          estimatedHours: estimatedHours === "none" ? undefined : parseFloat(estimatedHours),
        }),
      })

      if (response.ok) {
        onTaskUpdated()
        handleClose()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to update task")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setImages([])
    setStatus("")
    setStatusId("")
    setAssigneeId("unassigned")
    setPriority("")
    setDueDate("")
    setEstimatedHours("none")
  }

  const handleImageUpload = async (file: File): Promise<void> => {
    if (!task) return
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/images`, {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const newImage = await response.json()
        setImages(prev => [...prev, newImage])
      } else {
        throw new Error('Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      setError('Failed to upload image')
    }
  }

  const handleImageDelete = async (imageId: string): Promise<void> => {
    if (!task) return
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/images?imageId=${imageId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== imageId))
      } else {
        throw new Error('Failed to delete image')
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      setError('Failed to delete image')
    }
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const hasChanges = task ? (
    title.trim() !== task.title ||
    (description.trim() || undefined) !== task.description ||
    status !== task.status ||
    (assigneeId === "unassigned" ? undefined : assigneeId) !== task.assignee?.id ||
    (priority || undefined) !== task.priority ||
    (dueDate || undefined) !== (task.dueDate ? task.dueDate.split('T')[0] : undefined) ||
    (estimatedHours === "none" ? undefined : parseFloat(estimatedHours)) !== task.estimatedHours
  ) : false

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[625px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details. {task ? `You can edit this task because you ${task.createdBy?.id === task.assignee?.id ? "created and are assigned to it" : task.assignee ? "are assigned to it" : "created it"}.` : "Loading task details..."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Enter task description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusId || status} onValueChange={(value) => {
                  const selectedStatus = taskStatuses.find(s => s.id === value)
                  if (selectedStatus) {
                    setStatusId(value)
                    setStatus(selectedStatus.name)
                  } else {
                    // Fallback for old status values
                    setStatus(value)
                    setStatusId("")
                  }
                }} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskStatuses.length > 0 ? (
                      taskStatuses.map((taskStatus) => (
                        <SelectItem key={taskStatus.id} value={taskStatus.id}>
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: taskStatus.color }}
                            />
                            <span>{taskStatus.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      // Fallback to default statuses if no custom ones are configured
                      <>
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="estimatedHours">Estimated Time</Label>
                <Select value={estimatedHours} onValueChange={setEstimatedHours}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select estimated time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No estimate</SelectItem>
                    <SelectItem value="0.5">30 minutes</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="1.5">1.5 hours</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="2.5">2.5 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="3.5">3.5 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="4.5">4.5 hours</SelectItem>
                    <SelectItem value="5">5 hours</SelectItem>
                    <SelectItem value="5.5">5.5 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="6.5">6.5 hours</SelectItem>
                    <SelectItem value="7">7 hours</SelectItem>
                    <SelectItem value="7.5">7.5 hours</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="16">16 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="40">40 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ImageGallery
              images={images}
              onImageUpload={handleImageUpload}
              onImageDelete={handleImageDelete}
              editable={true}
            />

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim() || !hasChanges}
            >
              {loading ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
