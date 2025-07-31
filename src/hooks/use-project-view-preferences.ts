"use client"

import { useState, useEffect } from "react"

export type ViewMode = "list" | "board" | "gantt" | "daily"

interface ProjectViewPreferences {
  [projectId: string]: ViewMode
}

const STORAGE_KEY = "Nexus-project-view-preferences"

export function useProjectViewPreferences(projectId: string) {
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [isLoaded, setIsLoaded] = useState(false)

  // Wczytaj preferencje z localStorage przy inicjalizacji
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const preferences: ProjectViewPreferences = JSON.parse(stored)
        const projectViewMode = preferences[projectId]
        if (projectViewMode === "list" || projectViewMode === "board" || projectViewMode === "gantt" || projectViewMode === "daily") {
          setViewMode(projectViewMode)
        }
      }
    } catch (error) {
      console.warn("Błąd podczas wczytywania preferencji widoku projektu:", error)
    } finally {
      setIsLoaded(true)
    }
  }, [projectId])

  // Funkcja do zmiany widoku i zapisania w localStorage
  const updateViewMode = (newViewMode: ViewMode) => {
    setViewMode(newViewMode)

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const preferences: ProjectViewPreferences = stored ? JSON.parse(stored) : {}

      preferences[projectId] = newViewMode

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn("Błąd podczas zapisywania preferencji widoku projektu:", error)
    }
  }

  return {
    viewMode,
    updateViewMode,
    isLoaded
  }
}
