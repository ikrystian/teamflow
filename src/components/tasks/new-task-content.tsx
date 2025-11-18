"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { TaskFormContent } from "../shared/task-form-content"
import { usePageHeader } from "@/contexts/header-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Project } from "@/types"

export function NewTaskContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get("projectId")
  const [projects, setProjects] = useState<Project[]>([])
  const [defaultDate, setDefaultDate] = useState<Date | undefined>()
  const [defaultStartTime, setDefaultStartTime] = useState<Date | undefined>()
  const [defaultEndTime, setDefaultEndTime] = useState<Date | undefined>()

  // Set page header
  usePageHeader(
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-4">
        <Link href={projectIdFromUrl ? `/dashboard/projects/${projectIdFromUrl}` : "/dashboard/tasks"}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Utwórz nowe zadanie</h1>
      </div>
    </div>,
    [projectIdFromUrl]
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

  useEffect(() => {
    fetchProjects()

    // Check for default task data from localStorage (from calendar)
    const storedDefaults = localStorage.getItem('newTaskDefaults')
    if (storedDefaults) {
      try {
        const taskData = JSON.parse(storedDefaults)
        const date = new Date(taskData.date)
        setDefaultDate(date)

        if (taskData.startHour !== undefined) {
          const startTime = new Date(date)
          startTime.setHours(taskData.startHour, 0, 0, 0)
          setDefaultStartTime(startTime)
        }

        if (taskData.endHour !== undefined) {
          const endTime = new Date(date)
          endTime.setHours(taskData.endHour, 0, 0, 0)
          setDefaultEndTime(endTime)
        }

        // Clear the stored data
        localStorage.removeItem('newTaskDefaults')
      } catch (error) {
        console.error("Error parsing stored task defaults:", error)
      }
    }
  }, [fetchProjects])

  const handleTaskCreated = () => {
    if (projectIdFromUrl) {
      router.push(`/dashboard/projects/${projectIdFromUrl}`)
    } else {
      router.push("/dashboard/tasks")
    }
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
        mode="create"
        onTaskCreated={handleTaskCreated}
        onClose={handleClose}
        projects={projects}
        projectId={projectIdFromUrl || undefined}
        forceAssignToCurrentUser={true}
        defaultDate={defaultDate}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
      />
    </div>
  )
}
