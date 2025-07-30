"use client"

import { useState, useEffect } from "react"
import type { VisibilityState, Updater } from "@tanstack/react-table"

interface TasksTablePreferences {
  columnVisibility: VisibilityState
  columnOrder: string[]
}

const STORAGE_KEY = "Nexus-tasks-table-preferences"

// Domyślne ustawienia widoczności kolumn
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  title: true,
  assignee: true,
  createdBy: true, // Nowa kolumna autora - zaraz po assignee
  priority: true,
  dueDate: true,
  status: true,
  project: true,
  createdAt: false, // Ukryta domyślnie
  estimatedHours: false, // Ukryta domyślnie
  reportedHours: false, // Ukryta domyślnie
}

// Domyślna kolejność kolumn
const DEFAULT_COLUMN_ORDER: string[] = [
  "title",
  "assignee",
  "createdBy", // Autor zadania zaraz po osobie przypisanej
  "priority",
  "dueDate",
  "status",
  "project",
  "createdAt",
  "estimatedHours",
  "reportedHours"
]

export function useTasksTablePreferences() {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_COLUMN_VISIBILITY)
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER)
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

        if (preferences.columnOrder) {
          // Połącz zapisaną kolejność z domyślną (dla nowych kolumn)
          const savedOrder = preferences.columnOrder
          const newColumns = DEFAULT_COLUMN_ORDER.filter(col => !savedOrder.includes(col))
          const mergedOrder = [...savedOrder, ...newColumns]
          setColumnOrder(mergedOrder)
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
    savePreferences(newVisibility, columnOrder)
  }

  // Funkcja do aktualizacji kolejności kolumn i zapisania w localStorage
  const updateColumnOrder = (newOrder: string[]) => {
    setColumnOrder(newOrder)
    savePreferences(columnVisibility, newOrder)
  }

  // Funkcja pomocnicza do zapisywania preferencji
  const savePreferences = (visibility: VisibilityState, order: string[]) => {
    try {
      const preferences: TasksTablePreferences = {
        columnVisibility: visibility,
        columnOrder: order
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn("Błąd podczas zapisywania preferencji tabeli zadań:", error)
    }
  }

  return {
    columnVisibility,
    columnOrder,
    updateColumnVisibility,
    updateColumnOrder,
    isLoaded
  }
}
