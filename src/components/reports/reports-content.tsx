"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, Clock, Calendar } from "lucide-react"
import type { Task, TaskStatus } from "@/types"

interface TasksStatistics {
  totalPlannedTasks: number
  totalEstimatedHours: number
  totalWorkingDays: number
}

export function ReportsContent() {
  const [statistics, setStatistics] = useState<TasksStatistics>({
    totalPlannedTasks: 0,
    totalEstimatedHours: 0,
    totalWorkingDays: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatistics() {
      try {
        // Fetch tasks
        const tasksResponse = await fetch("/api/tasks")
        const tasksData = await tasksResponse.json()
        const tasks: Task[] = tasksData.tasks || []

        // Fetch task statuses
        const statusesResponse = await fetch("/api/system/task-statuses")
        const statusesData = await statusesResponse.json()
        const taskStatuses: TaskStatus[] = statusesData.taskStatuses || []

        // Find the "Done" status (or similar completion statuses)
        const doneStatuses = taskStatuses.filter(
          (status) => status.name.toLowerCase() === "done" || status.name.toLowerCase() === "completed"
        )
        const doneStatusIds = doneStatuses.map((s) => s.id)

        // Filter tasks that are not done (planned tasks)
        const plannedTasks = tasks.filter((task) => {
          // If task has no status, consider it as planned
          if (!task.taskStatus?.id) return true
          // If task status is not in done statuses, consider it as planned
          return !doneStatusIds.includes(task.taskStatus.id)
        })

        // Calculate total estimated hours
        const totalEstimatedHours = plannedTasks.reduce((sum, task) => {
          return sum + (task.estimatedHours || 0)
        }, 0)

        // Convert to working days (8 hours per working day)
        const totalWorkingDays = totalEstimatedHours / 8

        setStatistics({
          totalPlannedTasks: plannedTasks.length,
          totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100, // Round to 2 decimal places
          totalWorkingDays: Math.round(totalWorkingDays * 100) / 100, // Round to 2 decimal places
        })
      } catch (error) {
        console.error("Error fetching statistics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Raporty</h1>
        <p className="text-muted-foreground mt-2">
          Przegląd zaplanowanych zadań i wymaganego czasu pracy
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Zaplanowane zadania
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalPlannedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.totalPlannedTasks === 1
                ? "zadanie do wykonania"
                : statistics.totalPlannedTasks < 5
                ? "zadania do wykonania"
                : "zadań do wykonania"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Szacowany czas
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalEstimatedHours}h</div>
            <p className="text-xs text-muted-foreground">
              wymaganych godzin pracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dni robocze
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalWorkingDays}</div>
            <p className="text-xs text-muted-foreground">
              dni roboczych (8h/dzień)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacje o obliczeniach</CardTitle>
          <CardDescription>
            Jak obliczamy statystyki zadań
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>Zaplanowane zadania:</strong> Zadania, które nie mają statusu
            &quot;Done&quot; lub &quot;Completed&quot;
          </div>
          <div>
            <strong>Szacowany czas:</strong> Suma pola &quot;Szacowany czas&quot; ze wszystkich
            zaplanowanych zadań
          </div>
          <div>
            <strong>Dni robocze:</strong> Całkowity szacowany czas podzielony przez 8 godzin
            (standardowy dzień roboczy)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
