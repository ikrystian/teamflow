"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  Download,
  Calendar,
  Filter,
  FileText,
  PieChart
} from "lucide-react"
import { TimeTrackingReport } from "./time-tracking-report"
import { ProjectProgressReport } from "./project-progress-report"
import { exportTimeTrackingToPDF, exportProjectProgressToPDF } from "@/lib/pdf-export"

interface Team {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  team: {
    id: string
    name: string
  }
}

interface User {
  id: string
  name: string
  email: string
}

export function ReportsContent() {
  const { data: session } = useSession() as { data: Session | null }
  const [activeReport, setActiveReport] = useState<"time-tracking" | "project-progress">("time-tracking")
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [reportData, setReportData] = useState<any>(null)

  // Filters
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    projectId: "",
    userId: "",
    teamId: ""
  })

  useEffect(() => {
    fetchFilterData()

    // Set default date range (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    setFilters(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }))
  }, [])

  const fetchFilterData = async () => {
    try {
      const [teamsRes, projectsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/projects")
      ])

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(teamsData.teams || [])

        // Extract all users from teams
        const allUsers = new Map()
        teamsData.teams?.forEach((team: any) => {
          team.members?.forEach((user: any) => {
            allUsers.set(user.id, user)
          })
        })
        setUsers(Array.from(allUsers.values()))
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        setProjects(projectsData.projects || [])
      }
    } catch (error) {
      console.error("Error fetching filter data:", error)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      projectId: "",
      userId: "",
      teamId: ""
    })
  }

  const exportReport = async (format: "excel" | "csv" | "pdf") => {
    setLoading(true)
    try {
      if (format === "pdf") {
        // Handle PDF export client-side
        if (!reportData) {
          console.error("No report data available for PDF export")
          return
        }

        let doc
        if (activeReport === "time-tracking") {
          doc = exportTimeTrackingToPDF(reportData, filters)
        } else if (activeReport === "project-progress") {
          doc = exportProjectProgressToPDF(reportData, filters)
        } else {
          console.error("Unknown report type for PDF export")
          return
        }

        doc.save(`${activeReport}-report.pdf`)
      } else {
        // Handle Excel/CSV export server-side
        const response = await fetch("/api/reports/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reportType: activeReport,
            format,
            ...filters
          }),
        })

        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${activeReport}-report.${format === 'excel' ? 'xlsx' : 'csv'}`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        } else {
          console.error("Export failed")
        }
      }
    } catch (error) {
      console.error("Error exporting report:", error)
    } finally {
      setLoading(false)
    }
  }

  const reportTypes = [
    {
      id: "time-tracking",
      name: "Time Tracking Report",
      description: "Detailed breakdown of time spent by users on tasks and projects",
      icon: Clock,
      color: "text-blue-600"
    },
    {
      id: "project-progress",
      name: "Project Progress Report",
      description: "Overview of project completion status and task distribution",
      icon: TrendingUp,
      color: "text-green-600"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div id="page-header"  className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate detailed reports and analytics for your projects</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportReport("csv")}
            disabled={loading}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport("excel")}
            disabled={loading}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport("pdf")}
            disabled={loading}
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((report) => (
          <Card
            key={report.id}
            className={`cursor-pointer transition-all ${
              activeReport === report.id
                ? "ring-2 ring-blue-500 bg-blue-50"
                : "hover:shadow-md"
            }`}
            onClick={() => setActiveReport(report.id as any)}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <report.icon className={`h-8 w-8 ${report.color}`} />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {report.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {report.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Customize your report by applying filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={filters.teamId || "all"} onValueChange={(value) => handleFilterChange("teamId", value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={filters.projectId || "all"} onValueChange={(value) => handleFilterChange("projectId", value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={filters.userId || "all"} onValueChange={(value) => handleFilterChange("userId", value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {activeReport === "time-tracking" && (
        <TimeTrackingReport filters={filters} onDataLoaded={setReportData} />
      )}
      {activeReport === "project-progress" && (
        <ProjectProgressReport filters={filters} onDataLoaded={setReportData} />
      )}
    </div>
  )
}
