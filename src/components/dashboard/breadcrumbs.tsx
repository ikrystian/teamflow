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
        case 'reports':
          label = 'Raporty'
          break
        case 'clients':
          label = 'Klienci'
          break
        case 'github-webhook':
          label = 'GitHub Webhooks'
          break
        case 'new':
          label = 'Nowe zadanie'
          break
        default: {
          const previousSegment = segments[i - 1]

          // Project URLs carry a human-readable slug (older links: the id),
          // which can be short, so resolve it before the id heuristics below.
          if (previousSegment === 'projects') {
            const project = projects.find(p => p.slug === segment || p.id === segment)
            if (project) {
              label = project.name
              break
            }
            if (missingProjects[segment]) {
              label = missingProjects[segment]
              break
            }
            // The API looks projects up by id only; a slug missing from the
            // list (e.g. an archived project) can't be fetched by name.
            const looksLikeId = /^[a-z0-9]{20,}$/.test(segment)
            if (looksLikeId) fetchMissingProject(segment)
            label = projectsLoading || looksLikeId ? 'Ładowanie projektu...' : 'Projekt'
            break
          }

          // Check if it's a dynamic segment (UUID-like)
          if (segment.length > 10) {
            const user = users.find(u => u.id === segment)
            if (user) {
              label = user.name
              break
            }

            // If no match found, check if data is still loading
            label = projectsLoading || dataLoading ? 'Ładowanie...' : 'Szczegóły'
          }
          break
        }
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
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap gap-1 text-[13px] sm:gap-1.5">
        {breadcrumbs.map((breadcrumb, index) => (
          <div
            key={breadcrumb.href}
            className={`flex min-w-0 items-center gap-1 sm:gap-1.5 ${breadcrumb.isLast ? "" : "max-sm:hidden"}`}
          >
            {index > 0 && <BreadcrumbSeparator className="max-sm:hidden" />}
            <BreadcrumbItem className="min-w-0">
              {breadcrumb.isLast ? (
                <BreadcrumbPage className="truncate font-medium">{breadcrumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={breadcrumb.href} className="truncate">
                    {breadcrumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
