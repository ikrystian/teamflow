"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { TaskFormContent } from "../shared/task-form-content"
import { usePageHeader } from "@/contexts/header-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Project, Task } from "@/types"
import { PageLoadingLayout } from "@/components/ui/page-loading-layout"

interface EditTaskContentProps {
  taskId: string
}

export function EditTaskContent({ taskId }: EditTaskContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get("projectId")
  const [projects, setProjects] = useState<Project[]>([])
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  // Set page header
  usePageHeader(
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-4">
        <Link href={projectIdFromUrl ? `/dashboard/projects/${projectIdFromUrl}` : "/dashboard/tasks"}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          {task ? `Edytuj zadanie: ${task.title}` : "Edytuj zadanie"}
        </h1>
      </div>
    </div>,
    [task, projectIdFromUrl]
  )

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects?includeArchived=false")
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }, [])

  const fetchTask = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`)
      if (response.ok) {
        const data = await response.json()
        setTask(data.task)
      } else if (response.status === 404) {
        router.push("/dashboard/tasks")
      }
    } catch (error) {
      console.error("Error fetching task:", error)
    } finally {
      setLoading(false)
    }
  }, [taskId, router])

  useEffect(() => {
    Promise.all([fetchProjects(), fetchTask()])
  }, [fetchProjects, fetchTask])

  const handleTaskUpdated = () => {
    if (projectIdFromUrl) {
      router.push(`/dashboard/projects/${projectIdFromUrl}`)
    } else {
      router.push("/dashboard/tasks")
    }
  }

  if (loading) {
    return <PageLoadingLayout variant="form" />
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 pt-6">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Zadanie nie znalezione</h3>
          <p className="text-muted-foreground mb-4">
            Zadanie, które próbujesz edytować, nie istnieje lub nie masz do niego dostępu.
          </p>
          <Link href="/dashboard/tasks">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do zadań
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleClose = () => {
    if (projectIdFromUrl) {
      router.push(`/dashboard/projects/${projectIdFromUrl}`)
    } else {
      router.push("/dashboard/tasks")
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pt-6">
      <TaskFormContent
        mode="edit"
        task={task}
        onTaskUpdated={handleTaskUpdated}
        onClose={handleClose}
        projects={projects}
      />
    </div>
  )
}
