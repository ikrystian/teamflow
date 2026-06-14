"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { type Project } from "@/types"

interface ProjectsContextType {
  projects: Project[]
  loading: boolean
  fetchProjects: (includeArchived?: boolean) => Promise<void>
  refreshProjects: () => Promise<void>
  addProject: (project: Project) => void
  updateProject: (projectId: string, updates: Partial<Project>) => void
  removeProject: (projectId: string) => void
  reorderProjects: (orderedIds: string[]) => Promise<void>
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined)

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const { data: session, status } = useSession()

  const fetchProjects = useCallback(async (includeArchived: boolean = false) => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/projects?includeArchived=${includeArchived}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user])

  const refreshProjects = useCallback(async () => {
    // Odświeża projekty zachowując obecne ustawienia filtrowania
    // Domyślnie pobiera tylko aktywne projekty (dla sidebara)
    await fetchProjects(false)
  }, [fetchProjects])

  const addProject = useCallback((project: Project) => {
    setProjects(prev => [...prev, project])
  }, [])

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === projectId
          ? { ...project, ...updates }
          : project
      )
    )
  }, [])

  const removeProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId))
  }, [])

  const reorderProjects = useCallback(async (orderedIds: string[]) => {
    // Optimistic update
    setProjects(prev => {
      const map = new Map(prev.map(p => [p.id, p]))
      const reordered = orderedIds.reduce<Project[]>((acc, id, index) => {
        const p = map.get(id)
        if (p) acc.push({ ...p, sortOrder: index })
        return acc
      }, [])
      const rest = prev.filter(p => !orderedIds.includes(p.id))
      return [...reordered, ...rest]
    })
    try {
      await fetch('/api/projects/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })
    } catch (error) {
      console.error('Error reordering projects:', error)
    }
  }, [])

  // Wczytaj projekty tylko gdy użytkownik jest zalogowany
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchProjects(false) // Domyślnie tylko aktywne projekty
    } else if (status === 'unauthenticated') {
      setLoading(false)
      setProjects([])
    }
  }, [status, session?.user, fetchProjects])

  const value = {
    projects,
    loading,
    fetchProjects,
    refreshProjects,
    addProject,
    updateProject,
    removeProject,
    reorderProjects,
  }

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider')
  }
  return context
}

// Hook do pobierania projektów z filtrowaniem
export function useProjectsWithFilter(filter: 'active' | 'archived' | 'all' = 'active') {
  const { projects, loading, fetchProjects } = useProjects()
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const includeArchived = filter === 'archived' || filter === 'all'
      fetchProjects(includeArchived)
    }
  }, [filter, fetchProjects, status, session?.user])

  useEffect(() => {
    let filtered = projects

    if (filter === 'active') {
      filtered = projects.filter(project => !project.archived)
    } else if (filter === 'archived') {
      filtered = projects.filter(project => project.archived)
    }
    // filter === 'all' - zwraca wszystkie projekty bez filtrowania

    setFilteredProjects(filtered)
  }, [projects, filter])

  return {
    projects: filteredProjects,
    loading
  }
}
