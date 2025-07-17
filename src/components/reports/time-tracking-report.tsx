"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Line
} from "recharts"
import { Clock, Users, TrendingUp, Calendar } from "lucide-react"
import { format } from "date-fns"

interface TimeTrackingReportProps {
  filters: {
    startDate: string
    endDate: string
    projectId: string
    userId: string
    teamId: string
  }
  onDataLoaded?: (data: any) => void
}

interface TimeTrackingData {
  summary: {
    totalHours: number
    totalEntries: number
    uniqueUsers: number
    uniqueProjects: number
    dateRange: {
      start: string
      end: string
    }
  }
  userStats: Array<{
    user: {
      id: string
      name: string
      email: string
      avatarUrl?: string
    }
    totalHours: number
    entriesCount: number
    projects: string[]
    averageHoursPerDay: number
  }>
  projectStats: Array<{
    project: {
      id: string
      name: string
      team: {
        id: string
        name: string
      }
    }
    totalHours: number
    entriesCount: number
    users: string[]
    averageHoursPerEntry: number
  }>
  dailyStats: Array<{
    date: string
    totalHours: number
    entriesCount: number
    users: string[]
    averageHoursPerUser: number
  }>
  timeEntries: Array<{
    id: string
    hours: number
    description?: string
    date: string
    user: {
      id: string
      name: string
      email: string
      avatarUrl?: string
    }
    task: {
      id: string
      title: string
      estimatedHours?: number
      project: {
        id: string
        name: string
        team: {
          id: string
          name: string
        }
      }
    }
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function TimeTrackingReport({ filters, onDataLoaded }: TimeTrackingReportProps) {
  const [data, setData] = useState<TimeTrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchReportData()
  }, [filters])

  const fetchReportData = async () => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/reports/time-tracking?${params}`)

      if (response.ok) {
        const reportData = await response.json()
        setData(reportData)
        onDataLoaded?.(reportData)
      } else {
        setError("Failed to fetch report data")
      }
    } catch (error) {
      setError("An error occurred while fetching the report")
      console.error("Error fetching time tracking report:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  if (loading) {
    return (
      <div id="page-header" className="space-y-6">
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
            <p>No data available for the selected filters</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div id="page-header" className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatHours(data.summary.totalHours)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Time Entries</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary.totalEntries}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary.uniqueUsers}
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
                <p className="text-sm font-medium text-gray-500">Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary.uniqueProjects}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Time Tracking</CardTitle>
            <CardDescription>Hours logged per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                  formatter={(value: number) => [formatHours(value), 'Hours']}
                />
                <Line
                  type="monotone"
                  dataKey="totalHours"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Hours Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Hours by User</CardTitle>
            <CardDescription>Time distribution across team members</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.userStats.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ user, totalHours, percent }) =>
                    `${user.name || user.email} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalHours"
                >
                  {data.userStats.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatHours(value), 'Hours']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Statistics</CardTitle>
          <CardDescription>Detailed breakdown by team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.userStats.map((userStat) => (
              <div key={userStat.user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={userStat.user.avatarUrl} alt={userStat.user.name} />
                    <AvatarFallback>
                      {userStat.user.name?.charAt(0) || userStat.user.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{userStat.user.name || userStat.user.email}</p>
                    <p className="text-sm text-gray-500">
                      {userStat.projects.length} project{userStat.projects.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatHours(userStat.totalHours)}</p>
                  <p className="text-sm text-gray-500">
                    {userStat.entriesCount} entries
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Project Statistics</CardTitle>
          <CardDescription>Time breakdown by project</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.projectStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="project.name"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [formatHours(value), 'Hours']}
                labelFormatter={(label) => `Project: ${label}`}
              />
              <Bar dataKey="totalHours" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
