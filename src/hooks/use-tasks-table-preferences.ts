"use client"

import { useState, useEffect } from "react"
import type { VisibilityState, Updater } from "@tanstack/react-table"

interface TasksTablePreferences {
  columnVisibility: VisibilityState
}

const STORAGE_KEY = "teamflow-tasks-table-preferences"

// Domyślne ustawienia widoczności kolumn
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  title: true,
  assignee: true,
  priority: true,
  dueDate: true,
  status: true,
  project: true,
  createdBy: true, // Nowa kolumna autora
  createdAt: false, // Ukryta domyślnie
  estimatedHours: false, // Ukryta domyślnie
  reportedHours: false, // Ukryta domyślnie
}

export function useTasksTablePreferences() {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_COLUMN_VISIBILITY)
  const [isLoaded, setIsLoaded] = useState(false)

  // Wczytaj preferencje z localStorage przy inicjalizacji
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const preferences: TasksTablePreferences = JSON.parse(stored)
        if (preferences.columnVisibility) {
          // Połącz zapisane preferencje z domyślnymi (dla nowych kolumn)
          const mergedVisibility = {
            ...DEFAULT_COLUMN_VISIBILITY,
            ...preferences.columnVisibility
          }
          setColumnVisibility(mergedVisibility)
        }
      }
    } catch (error) {
      console.warn("Błąd podczas wczytywania preferencji tabeli zadań:", error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Funkcja do aktualizacji widoczności kolumn i zapisania w localStorage
  const updateColumnVisibility = (updaterOrValue: Updater<VisibilityState>) => {
    const newVisibility = typeof updaterOrValue === 'function'
      ? updaterOrValue(columnVisibility)
      : updaterOrValue

    setColumnVisibility(newVisibility)

    try {
      const preferences: TasksTablePreferences = {
        columnVisibility: newVisibility
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn("Błąd podczas zapisywania preferencji tabeli zadań:", error)
    }
  }

  return {
    columnVisibility,
    updateColumnVisibility,
    isLoaded
  }
}
