"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface Project {
  id: string
  name: string
  description?: string
  status?: string
  color?: string
  icon?: string
  imageUrl?: string
  archived?: boolean
  createdAt?: string
  team: {
    id: string
    name: string
  }
  tasks?: {
    id: string
    title: string
    statusId?: string
    taskStatus?: {
      id: string
      name: string
      color: string
    }
    priority?: string
    dueDate?: string
    assignee?: {
      id: string
      name: string
      avatarUrl?: string
    }
  }[]
}

interface ProjectsContextType {
  projects: Project[]
  loading: boolean
  fetchProjects: (includeArchived?: boolean) => Promise<void>
  refreshProjects: () => Promise<void>
  addProject: (project: Project) => void
  updateProject: (projectId: string, updates: Partial<Project>) => void
  removeProject: (projectId: string) => void
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
    removeProject
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
