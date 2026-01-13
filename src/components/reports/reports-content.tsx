"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ClipboardList,
  Clock,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Download
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

interface ReportData {
  summary: {
    totalTasks: number
    completedTasks: number
    completionRate: number
    totalHours: number
    totalEstimatedHours: number
    averageTimePerTask: number
    timeVariance: number
  }
  charts: {
    tasksByStatus: Array<{ name: string; count: number; color: string }>
    tasksByPriority: Array<{ priority: string; count: number }>
    dailyHours: Array<{ date: string; hours: number }>
    weeklyHours: Array<{ week: string; hours: number }>
    estimatedVsActual: Array<{ project: string; estimated: number; actual: number; color: string }>
  }
  tables: {
    topTasksByTime: Array<{
      id: string
      title: string
      project: string
      projectColor: string
      status: string
      statusColor: string
      totalHours: number
      estimatedHours: number
      difference: number
      priority: string
    }>
    projectStats: Array<{
      id: string
      name: string
      color: string
      totalHours: number
      estimatedHours: number
      taskCount: number
      completedTasks: number
      completionRate: number
    }>
    tagStats: Array<{
      id: string
      name: string
      color: string
      totalHours: number
      estimatedHours: number
      taskCount: number
      completedTasks: number
      completionRate: number
    }>
  }
  timeRange: string
  generatedAt: string
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1']

const PRIORITY_COLORS: Record<string, string> = {
  'Urgent': '#ef4444',
  'High': '#f97316',
  'Medium': '#f59e0b',
  'Low': '#10b981',
  'None': '#6b7280'
}

export function ReportsContent() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("month")

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true)
      try {
        const response = await fetch(`/api/reports?timeRange=${timeRange}`)
        const data = await response.json()
        setReportData(data)
      } catch (error) {
        console.error("Error fetching report data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          Nie udało się załadować danych raportu
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Raporty</h1>
          <p className="text-muted-foreground mt-2">
            Kompleksowe podsumowanie pracy i statystyk
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Wybierz okres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Ostatni tydzień</SelectItem>
              <SelectItem value="month">Ostatni miesiąc</SelectItem>
              <SelectItem value="quarter">Ostatni kwartał</SelectItem>
              <SelectItem value="year">Ostatni rok</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Łącznie zadań</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {reportData.summary.completedTasks} ukończonych ({reportData.summary.completionRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przepracowane godziny</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              z {reportData.summary.totalEstimatedHours}h szacowanych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Średni czas/zadanie</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.averageTimePerTask}h</div>
            <p className="text-xs text-muted-foreground">
              na zadanie z logowanym czasem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Odchylenie czasowe</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${reportData.summary.timeVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {reportData.summary.timeVariance > 0 ? '+' : ''}{reportData.summary.timeVariance}h
            </div>
            <p className="text-xs text-muted-foreground">
              różnica rzeczywisty vs szacowany
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Godziny w czasie
            </CardTitle>
            <CardDescription>Przepracowane godziny dziennie</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.charts.dailyHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pl-PL')}
                  formatter={(value: number) => [`${value}h`, 'Godziny']}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks by Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Zadania według statusu
            </CardTitle>
            <CardDescription>Rozkład zadań według statusu</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.charts.tasksByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reportData.charts.tasksByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tasks by Priority */}
        <Card>
          <CardHeader>
            <CardTitle>Zadania według priorytetu</CardTitle>
            <CardDescription>Rozkład zadań według priorytetu</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.charts.tasksByPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {reportData.charts.tasksByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estimated vs Actual */}
        <Card>
          <CardHeader>
            <CardTitle>Szacowany vs Rzeczywisty czas</CardTitle>
            <CardDescription>Porównanie czasu według projektów</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.charts.estimatedVsActual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="project" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value}h`} />
                <Legend />
                <Bar dataKey="estimated" name="Szacowany" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Rzeczywisty" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Hours Trend */}
      {reportData.charts.weeklyHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trend tygodniowy</CardTitle>
            <CardDescription>Przepracowane godziny w poszczególnych tygodniach</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.charts.weeklyHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => `Tydzień ${new Date(value).toLocaleDateString('pl-PL')}`}
                  formatter={(value: number) => [`${value}h`, 'Godziny']}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tables */}
      <div className="grid gap-4 md:grid-cols-1">
        {/* Top Tasks by Time */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 zadań według czasu</CardTitle>
            <CardDescription>Zadania z najdłuższym zarejestrowanym czasem pracy</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zadanie</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priorytet</TableHead>
                  <TableHead className="text-right">Szacowany</TableHead>
                  <TableHead className="text-right">Rzeczywisty</TableHead>
                  <TableHead className="text-right">Różnica</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.tables.topTasksByTime.length > 0 ? (
                  reportData.tables.topTasksByTime.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {task.title}
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: `${task.projectColor}20`, color: task.projectColor }}
                        >
                          {task.project}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: `${task.statusColor}20`, color: task.statusColor }}
                        >
                          {task.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${PRIORITY_COLORS[task.priority] || '#6b7280'}20`,
                            color: PRIORITY_COLORS[task.priority] || '#6b7280'
                          }}
                        >
                          {task.priority || 'None'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{task.estimatedHours}h</TableCell>
                      <TableCell className="text-right font-medium">{task.totalHours}h</TableCell>
                      <TableCell className={`text-right font-medium ${task.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {task.difference > 0 ? '+' : ''}{task.difference}h
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Brak zadań z zarejestrowanym czasem
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Project Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Statystyki według projektów</CardTitle>
            <CardDescription>Podsumowanie pracy w poszczególnych projektach</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead className="text-right">Zadania</TableHead>
                  <TableHead className="text-right">Ukończone</TableHead>
                  <TableHead className="text-right">% ukończenia</TableHead>
                  <TableHead className="text-right">Szacowany czas</TableHead>
                  <TableHead className="text-right">Rzeczywisty czas</TableHead>
                  <TableHead className="text-right">Wydajność</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.tables.projectStats.length > 0 ? (
                  reportData.tables.projectStats.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: `${project.color}20`, color: project.color }}
                        >
                          {project.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{project.taskCount}</TableCell>
                      <TableCell className="text-right">{project.completedTasks}</TableCell>
                      <TableCell className="text-right">{project.completionRate}%</TableCell>
                      <TableCell className="text-right">{project.estimatedHours}h</TableCell>
                      <TableCell className="text-right font-medium">{project.totalHours}h</TableCell>
                      <TableCell className={`text-right font-medium ${project.totalHours <= project.estimatedHours ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {project.estimatedHours > 0
                          ? `${Math.round((project.totalHours / project.estimatedHours) * 100)}%`
                          : 'N/A'
                        }
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Brak danych projektów
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informacje o raporcie</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p><strong>Okres:</strong> {
            timeRange === 'week' ? 'Ostatni tydzień' :
              timeRange === 'month' ? 'Ostatni miesiąc' :
                timeRange === 'quarter' ? 'Ostatni kwartał' :
                  timeRange === 'year' ? 'Ostatni rok' : timeRange
          }</p>
          <p><strong>Wygenerowano:</strong> {new Date(reportData.generatedAt).toLocaleString('pl-PL')}</p>
          <p className="mt-2 pt-2 border-t">
            <strong>Uwaga:</strong> Wszystkie czasy są obliczane na podstawie wpisów czasu pracy (time entries) zarejestrowanych w zadaniach.
            Statystyki pokazują tylko dane dla zadań przypisanych do Ciebie.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
