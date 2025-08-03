"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Cell,
  LineChart,
  Line,
  ComposedChart
} from "recharts"
import {
  Activity,
  TrendingUp,
  Users,
  FolderOpen,
  CheckSquare,
  Clock,
  AlertTriangle,
  Target,
  Calendar,
  Zap
} from "lucide-react"
import { format} from "date-fns"
import { pl } from "date-fns/locale"

interface DashboardOverviewReportProps {
  filters: {
    startDate: string
    endDate: string
    projectId: string
    userId: string
    teamId: string
  }
  onDataLoaded?: (data: DashboardOverviewData) => void
}

export interface DashboardOverviewData {
  kpis: {
    totalTasks: number
    completedTasks: number
    overdueTasks: number
    inProgressTasks: number
    totalProjects: number
    activeUsers: number
    totalTimeLogged: number
    avgTaskCompletionTime: number
    productivityScore: number
    teamEfficiency: number
  }
  trends: {
    tasksCreated: Array<{ date: string; count: number }>
    tasksCompleted: Array<{ date: string; count: number }>
    timeLogged: Array<{ date: string; hours: number }>
    productivity: Array<{ date: string; score: number }>
  }
  projectDistribution: Array<{
    project: string
    tasks: number
    completed: number
    hours: number
    color: string
  }>
  userPerformance: Array<{
    user: string
    completedTasks: number
    hoursLogged: number
    efficiency: number
    avatar?: string
  }>
  taskStatusDistribution: Array<{
    status: string
    count: number
    percentage: number
    color: string
  }>
  priorityDistribution: Array<{
    priority: string
    count: number
    color: string
  }>
  burndownData: Array<{
    date: string
    planned: number
    actual: number
    ideal: number
  }>
}

export function DashboardOverviewReport({ filters, onDataLoaded }: DashboardOverviewReportProps) {
  const [data, setData] = useState<DashboardOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("30d")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        ...filters,
        timeframe,
        reportType: 'dashboard-overview'
      })

      const response = await fetch(`/api/reports/dashboard-overview?${queryParams}`)

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard overview data')
      }

      const result = await response.json()
      setData(result)
      onDataLoaded?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [filters, timeframe, onDataLoaded])

  useEffect(() => {
    fetchData()
  }, [filters, timeframe, fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchData} className="mt-4">Spróbuj ponownie</Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { kpis, trends, projectDistribution, userPerformance, taskStatusDistribution, burndownData } = data

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Przegląd Dashboard</h2>
        <Select value={timeframe} onValueChange={(value: "7d" | "30d" | "90d") => setTimeframe(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dni</SelectItem>
            <SelectItem value="30d">30 dni</SelectItem>
            <SelectItem value="90d">90 dni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wszystkie zadania</p>
                <p className="text-2xl font-bold">{kpis.totalTasks}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {((kpis.completedTasks / kpis.totalTasks) * 100).toFixed(1)}% ukończone
                  </Badge>
                </div>
              </div>
              <CheckSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Zadania przeterminowane</p>
                <p className="text-2xl font-bold text-red-600">{kpis.overdueTasks}</p>
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-600">Wymaga uwagi</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktywne projekty</p>
                <p className="text-2xl font-bold">{kpis.totalProjects}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">W trakcie</span>
                </div>
              </div>
              <FolderOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wydajność zespołu</p>
                <p className="text-2xl font-bold">{kpis.productivityScore}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Wskaźnik wydajności</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktywni użytkownicy</p>
                <p className="text-2xl font-bold">{kpis.activeUsers}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Ostatnie 7 dni</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Całkowity czas</p>
                <p className="text-2xl font-bold">{formatHours(kpis.totalTimeLogged)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Activity className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Zalogowany czas</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Śr. czas zadania</p>
                <p className="text-2xl font-bold">{kpis.avgTaskCompletionTime.toFixed(1)}d</p>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3 text-indigo-500" />
                  <span className="text-xs text-muted-foreground">Do ukończenia</span>
                </div>
              </div>
              <Calendar className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Efektywność zespołu</p>
                <p className="text-2xl font-bold">{kpis.teamEfficiency}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">Powyżej średniej</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Burndown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Wykres spalania zadań</CardTitle>
            <CardDescription>Porównanie planowanego i rzeczywistego postępu</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'dd/MM')} />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: pl })}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'planned' ? 'Planowane' : name === 'actual' ? 'Rzeczywiste' : 'Idealne'
                  ]}
                />
                <Line type="monotone" dataKey="ideal" stroke="#94A3B8" strokeDasharray="5 5" name="Idealne" />
                <Line type="monotone" dataKey="planned" stroke="#3B82F6" name="Planowane" />
                <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} name="Rzeczywiste" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rozkład statusów zadań</CardTitle>
            <CardDescription>Aktualny stan wszystkich zadań</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskStatusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {taskStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Trendy wydajności</CardTitle>
            <CardDescription>Dzienna wydajność i czas logowany</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={trends.productivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'dd/MM')} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: pl })}
                />
                <Bar yAxisId="left" dataKey="score" fill="#3B82F6" name="Wydajność %" />
                <Line yAxisId="right" type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2} name="Trend" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rozkład projektów</CardTitle>
            <CardDescription>Zadania i godziny według projektów</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectDistribution.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="project" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="#3B82F6" name="Zadania" />
                <Bar dataKey="completed" fill="#10B981" name="Ukończone" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wydajność zespołu</CardTitle>
          <CardDescription>Ranking członków zespołu według ukończonych zadań i wydajności</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Użytkownik</th>
                  <th className="text-right p-2">Ukończone zadania</th>
                  <th className="text-right p-2">Zalogowane godziny</th>
                  <th className="text-right p-2">Wydajność</th>
                  <th className="text-right p-2">Ranking</th>
                </tr>
              </thead>
              <tbody>
                {userPerformance.map((user, index) => (
                  <tr key={user.user} className="border-b last:border-b-0">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                          {user.user.charAt(0).toUpperCase()}
                        </div>
                        {user.user}
                      </div>
                    </td>
                    <td className="text-right p-2">{user.completedTasks}</td>
                    <td className="text-right p-2">{formatHours(user.hoursLogged)}</td>
                    <td className="text-right p-2">
                      <Badge variant={user.efficiency >= 80 ? "default" : user.efficiency >= 60 ? "secondary" : "destructive"}>
                        {user.efficiency}%
                      </Badge>
                    </td>
                    <td className="text-right p-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}