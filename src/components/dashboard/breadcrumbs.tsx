"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"

interface BreadcrumbSegment {
  label: string
  href: string
  isLast: boolean
}

interface Project {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
}

interface User {
  id: string
  name: string
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname()
  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])

  // Fetch data for dynamic segments
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, teamsRes, usersRes] = await Promise.all([
          fetch('/api/projects?includeArchived=true'),
          fetch('/api/teams'),
          fetch('/api/users')
        ])

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json()
          setProjects(projectsData.projects || [])
        }

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          setTeams(teamsData.teams || [])
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData.users || [])
        }
      } catch (error) {
        console.error('Error fetching breadcrumb data:', error)
      }
    }

    fetchData()
  }, [])

  const generateBreadcrumbs = (): BreadcrumbSegment[] => {
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
        case 'teams':
          label = 'Zespoły'
          break
        case 'reports':
          label = 'Raporty'
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
          // Check if it's a dynamic segment (UUID-like)
          if (segment.length > 10 && segment.includes('-')) {
            // Try to find the name for this ID
            const project = projects.find(p => p.id === segment)
            if (project) {
              label = project.name
              break
            }

            const team = teams.find(t => t.id === segment)
            if (team) {
              label = team.name
              break
            }

            const user = users.find(u => u.id === segment)
            if (user) {
              label = user.name
              break
            }

            // If no match found, use a generic label
            label = 'Szczegóły'
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
  }

  const breadcrumbs = generateBreadcrumbs()

  // Don't show breadcrumbs if we're just on the main dashboard
  if (breadcrumbs.length <= 1) {
    return null
  }

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
