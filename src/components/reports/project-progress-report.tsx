"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import {
  CheckSquare,
  Clock,
  TrendingUp,
  Target
} from "lucide-react"

interface ProjectProgressReportProps {
  filters: {
    startDate: string
    endDate: string
    projectId: string
    userId: string
    teamId: string
  }
  onDataLoaded?: (data: ProjectProgressData) => void
}

export interface ProjectProgressData {
  overallStats: {
    totalProjects: number
    totalTasks: number
    totalCompletedTasks: number
    totalLoggedHours: number
    totalEstimatedHours: number
    averageCompletionRate: number
  }
  projectReports: Array<{
    project: {
      id: string
      name: string
      description?: string
      status: string
      team: {
        id: string
        name: string
      }
    }
    taskStats: {
      total: number
      completed: number
      inProgress: number
      todo: number
      overdue: number
      dueSoon: number
      completionRate: number
    }
    timeStats: {
      totalLoggedHours: number
      totalEstimatedHours: number
      efficiency: number
      averageHoursPerTask: number
    }
    distributions: {
      status: Record<string, number>
      priority: Record<string, number>
    }
    userContributions: Array<{
      user: {
        id: string
        name: string
      }
      hours: number
      tasksWorkedOn: number
      percentage: number
    }>
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']
const STATUS_COLORS = {
  'To Do': '#6B7280',
  'In Progress': '#3B82F6',
  'Done': '#10B981'
}

export function ProjectProgressReport({ filters }: ProjectProgressReportProps) {
  const [data, setData] = useState<ProjectProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/reports/project-progress?${params}`)

      if (response.ok) {
        const reportData = await response.json()
        setData(reportData)
      } else {
        setError("Nie udało się pobrać danych raportu")
      }
    } catch (error) {
      setError("Wystąpił błąd podczas pobierania raportu")
      console.error("Error fetching project progress report:", error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-green-100 text-green-800'
      case 'In Progress': return 'bg-blue-100 text-blue-800'
      case 'To Do': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>Brak danych dla wybranych filtrów</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Projekty</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.overallStats.totalProjects}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Współczynnik ukończenia</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.overallStats.averageCompletionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Całkowita liczba godzin</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatHours(data.overallStats.totalLoggedHours)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Zadania</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.overallStats.totalCompletedTasks}/{data.overallStats.totalTasks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Completion Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Współczynniki ukończenia projektów</CardTitle>
          <CardDescription>Procent ukończenia według projektu</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.projectReports}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="project.name"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Współczynnik ukończenia']}
                labelFormatter={(label) => `Projekt: ${label}`}
              />
              <Bar dataKey="taskStats.completionRate" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Project Details */}
      <div className="space-y-6">
        {data.projectReports.map((projectReport) => (
          <Card key={projectReport.project.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {projectReport.project.name}
                    <Badge className={getStatusBadgeColor(projectReport.project.status)}>
                      {projectReport.project.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Zespół: {projectReport.project.team.name}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {projectReport.taskStats.completionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500">Ukończono</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Task Status Distribution */}
                <div>
                  <h4 className="font-medium mb-4">Rozkład statusów zadań</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={Object.entries(projectReport.distributions.status).map(([status, count]) => ({
                          name: status,
                          value: count,
                          color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6B7280'
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) =>
                          `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(projectReport.distributions.status).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Key Metrics */}
                <div>
                  <h4 className="font-medium mb-4">Kluczowe metryki</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wszystkie zadania:</span>
                      <span className="font-medium">{projectReport.taskStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ukończone:</span>
                      <span className="font-medium text-green-600">{projectReport.taskStats.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">W toku:</span>
                      <span className="font-medium text-blue-600">{projectReport.taskStats.inProgress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zaległe:</span>
                      <span className="font-medium text-red-600">{projectReport.taskStats.overdue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Termin wkrótce:</span>
                      <span className="font-medium text-yellow-600">{projectReport.taskStats.dueSoon}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zalogowany czas:</span>
                      <span className="font-medium">{formatHours(projectReport.timeStats.totalLoggedHours)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Szacowany czas:</span>
                      <span className="font-medium">{formatHours(projectReport.timeStats.totalEstimatedHours)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wydajność:</span>
                      <span className={`font-medium ${
                        projectReport.timeStats.efficiency > 100 ? 'text-red-600' :
                        projectReport.timeStats.efficiency > 80 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {projectReport.timeStats.efficiency.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Contributions */}
              {projectReport.userContributions.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-4">Wkład zespołu</h4>
                  <div className="space-y-2">
                    {projectReport.userContributions.map((contribution) => (
                      <div key={contribution.user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {contribution.user.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{contribution.user.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatHours(contribution.hours)}</p>
                          <p className="text-sm text-gray-500">
                            {contribution.tasksWorkedOn} zadań ({contribution.percentage.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
