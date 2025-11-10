"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"
import { useProjects } from "@/contexts/projects-context"

interface BreadcrumbSegment {
  label: string
  href: string
  isLast: boolean
}

interface User {
  id: string
  name: string
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname()
  const { projects, loading: projectsLoading } = useProjects()
  const [users, setUsers] = useState<User[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [missingProjects, setMissingProjects] = useState<{[key: string]: string}>({})

  // Fetch data for dynamic segments ( users only, projects come from context)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes] = await Promise.all([
          fetch('/api/users')
        ])

        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData.users || [])
        }
      } catch (error) {
        console.error('Error fetching breadcrumb data:', error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [])

  // Function to fetch missing project names
  const fetchMissingProject = useCallback(async (projectId: string) => {
    if (missingProjects[projectId] || projectsLoading) return

    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setMissingProjects(prev => ({
          ...prev,
          [projectId]: data.project.name
        }))
      }
    } catch (error) {
      console.error('Error fetching project name:', error)
    }
  }, [missingProjects, projectsLoading])

  const generateBreadcrumbs = useCallback((): BreadcrumbSegment[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbSegment[] = []

    // Always start with Dashboard
    breadcrumbs.push({
      label: "Panel",
      href: "/dashboard",
      isLast: segments.length === 1 && segments[0] === 'dashboard'
    })

    // If we're just on /dashboard, return early
    if (segments.length === 1 && segments[0] === 'dashboard') {
      return breadcrumbs
    }

    // Process each segment after /dashboard
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i]
      const isLast = i === segments.length - 1
      const currentPath = '/' + segments.slice(0, i + 1).join('/')

      let label = segment

      // Map segment names to Polish labels
      switch (segment) {
        case 'tasks':
          label = 'Moje zadania'
          break
        case 'calendar':
          label = 'Kalendarz'
          break
        case 'projects':
          label = 'Projekty'
          break
        case 'profile':
          label = 'Profil'
          break
        case 'settings':
          label = 'Ustawienia'
          break
        case 'info':
          label = 'Informacje'
          break
        default:

        console.log(segment)
          // Check if it's a dynamic segment (UUID-like)
          if (segment.length > 10) {
            // Try to find the name for this ID
            const project = projects.find(p => p.id === segment)
            if (project) {
              label = project.name
              break
            }

            // Check if we have a cached name for this project
            if (missingProjects[segment]) {
              label = missingProjects[segment]
              break
            }

            // If it's a project segment and we don't have the name, try to fetch it
            const previousSegment = segments[i - 1]
            if (previousSegment === 'projects') {
              fetchMissingProject(segment)
            }

            const user = users.find(u => u.id === segment)
            if (user) {
              label = user.name
              break
            }

            // If no match found, check if data is still loading
            if (projectsLoading || dataLoading) {
              label = 'Ładowanie...'
            } else {
              // For project segments, show a more user-friendly label while fetching
              if (previousSegment === 'projects') {
                label = missingProjects[segment] || 'Ładowanie projektu...'
              } else {
                label = 'Szczegóły'
              }
            }
          }
          break
      }

      breadcrumbs.push({
        label,
        href: currentPath,
        isLast
      })
    }

    return breadcrumbs
  }, [pathname, projects, users, missingProjects, projectsLoading, dataLoading, fetchMissingProject])

  const breadcrumbs = generateBreadcrumbs()

  return (
    <div className="px-4 py-2 border-b bg-muted/30">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={breadcrumb.href} className="flex items-center">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {breadcrumb.isLast ? (
                  <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={breadcrumb.href} className="flex items-center gap-1">
                      {index === 0 && <Home className="h-4 w-4" />}
                      {breadcrumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
