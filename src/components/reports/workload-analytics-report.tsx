"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
} from "recharts"
import {
  AlertTriangle,
  Users,
  Target,
  Zap,
} from "lucide-react"
import { format } from "date-fns"
import { pl } from "date-fns/locale"

interface WorkloadAnalyticsReportProps {
  filters: {
    startDate: string
    endDate: string
    projectId: string
    userId: string
    teamId: string
  }
  onDataLoaded?: (data: WorkloadAnalyticsData) => void
}

export interface WorkloadAnalyticsData {
  overview: {
    totalWorkload: number
    averageWorkload: number
    overloadedMembers: number
    underutilizedMembers: number
    burnoutRiskLevel: "low" | "medium" | "high"
    teamCapacityUtilization: number
    workloadBalance: number
    efficiencyScore: number
  }
  memberWorkload: Array<{
    user: {
      id: string
      name: string
      email: string
      avatarUrl?: string
      role: string
      contractHours: number
    }
    currentWorkload: {
      hoursAllocated: number
      hoursWorked: number
      tasksAssigned: number
      tasksInProgress: number
      utilizationRate: number
      efficiencyScore: number
    }
    capacity: {
      maxHours: number
      optimalHours: number
      availableHours: number
      overheadHours: number
    }
    burnoutIndicators: {
      riskLevel: "low" | "medium" | "high"
      overtimeHours: number
      consecutiveHighWorkloadDays: number
      stressSignals: Array<{
        indicator: string
        severity: "low" | "medium" | "high"
        description: string
      }>
    }
    trends: {
      dailyHours: Array<{ date: string; hours: number; planned: number }>
      weeklyWorkload: Array<{ week: string; workload: number; capacity: number }>
      productivityTrend: Array<{ date: string; score: number }>
    }
    upcomingDeadlines: Array<{
      taskTitle: string
      dueDate: string
      estimatedHours: number
      priority: string
    }>
  }>
  workloadDistribution: Array<{
    timeSlot: string
    totalHours: number
    plannedHours: number
    actualHours: number
    utilizationRate: number
  }>
  projectWorkload: Array<{
    project: string
    totalHours: number
    teamMembers: number
    averageWorkload: number
    deadlineStress: number
    color: string
  }>
  predictions: {
    nextWeekWorkload: Array<{
      user: string
      predictedHours: number
      confidence: number
      riskLevel: string
    }>
    capacityGaps: Array<{
      period: string
      shortfall: number
      surplus: number
      recommendations: string[]
    }>
    burnoutRisk: Array<{
      user: string
      currentRisk: number
      projectedRisk: number
      preventionActions: string[]
    }>
  }
  recommendations: {
    immediate: Array<{
      priority: "high" | "medium" | "low"
      action: string
      impact: string
      effort: "low" | "medium" | "high"
    }>
    longTerm: Array<{
      strategy: string
      benefits: string[]
      timeline: string
      resources: string[]
    }>
  }
}

const RISK_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444'
}

const WORKLOAD_THRESHOLDS = {
  underutilized: 60,
  optimal: 85,
  overloaded: 100
}

export function WorkloadAnalyticsReport({ filters, onDataLoaded }: WorkloadAnalyticsReportProps) {
  const [data, setData] = useState<WorkloadAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<string>("")
  const [viewType, setViewType] = useState<"current" | "trends" | "predictions">("current")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        ...filters,
        reportType: 'workload-analytics'
      })

      const response = await fetch(`/api/reports/workload-analytics?${queryParams}`)

      if (!response.ok) {
        throw new Error('Failed to fetch workload analytics data')
      }

      const result = await response.json()
      setData(result)
      onDataLoaded?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [filters, onDataLoaded])

  useEffect(() => {
    fetchData()
  }, [filters, fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error || 'Brak danych'}</p>
          <Button onClick={fetchData} className="mt-4">Spróbuj ponownie</Button>
        </CardContent>
      </Card>
    )
  }

  const getWorkloadColor = (utilization: number) => {
    if (utilization <= WORKLOAD_THRESHOLDS.underutilized) return RISK_COLORS.low
    if (utilization <= WORKLOAD_THRESHOLDS.optimal) return RISK_COLORS.medium
    return RISK_COLORS.high
  }

  const getWorkloadStatus = (utilization: number) => {
    if (utilization <= WORKLOAD_THRESHOLDS.underutilized) return 'Niedociążony'
    if (utilization <= WORKLOAD_THRESHOLDS.optimal) return 'Optymalny'
    return 'Przeciążony'
  }

  const selectedMemberData = selectedMember
    ? data.memberWorkload.find(m => m.user.id === selectedMember)
    : null

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analiza obciążenia zespołu</h2>
        <div className="flex gap-2">
          <Select value={viewType} onValueChange={(value: "current" | "trends" | "predictions") => setViewType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Aktualny stan</SelectItem>
              <SelectItem value="trends">Trendy</SelectItem>
              <SelectItem value="predictions">Prognozy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Critical Alerts */}
      {data.overview.burnoutRiskLevel === "high" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Wysokie ryzyko wypalenia w zespole! {data.overview.overloadedMembers} członków jest przeciążonych.
            Zalecane natychmiastowe działania naprawcze.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wykorzystanie zespołu</p>
                <p className="text-2xl font-bold">{data.overview.teamCapacityUtilization}%</p>
                <Progress value={data.overview.teamCapacityUtilization} className="mt-2" />
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Przeciążeni członkowie</p>
                <p className="text-2xl font-bold text-red-600">{data.overview.overloadedMembers}</p>
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-600">Wymaga natychmiastowej akcji</span>
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Balans obciążenia</p>
                <p className="text-2xl font-bold">{data.overview.workloadBalance}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <Target className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">Równowaga zespołu</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wskaźnik efektywności</p>
                <p className="text-2xl font-bold">{data.overview.efficiencyScore}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Produktywność</span>
                </div>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {viewType === "current" && (
        <div className="space-y-6">
          {/* Current Workload Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rozkład obciążenia zespołu</CardTitle>
                <CardDescription>Aktualny stan wykorzystania członków</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.memberWorkload.map(m => ({
                    name: m.user.name.split(' ')[0],
                    utilization: m.currentWorkload.utilizationRate,
                    efficiency: m.currentWorkload.efficiencyScore,
                    capacity: 100
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="capacity" fill="#E5E7EB" name="Maksymalna pojemność" />
                    <Bar dataKey="utilization" fill="#3B82F6" name="Wykorzystanie" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mapa ryzyka wypalenia</CardTitle>
                <CardDescription>Analiza ryzyka dla każdego członka zespołu</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={data.memberWorkload.map(m => ({
                    name: m.user.name,
                    workload: m.currentWorkload.utilizationRate,
                    burnoutRisk: m.burnoutIndicators.riskLevel === 'high' ? 80 :
                                m.burnoutIndicators.riskLevel === 'medium' ? 50 : 20,
                    efficiency: m.currentWorkload.efficiencyScore
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="workload" name="Obciążenie %" />
                    <YAxis dataKey="burnoutRisk" name="Ryzyko wypalenia" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white border rounded p-2 shadow">
                              <p className="font-medium">{data.name}</p>
                              <p>Obciążenie: {data.workload}%</p>
                              <p>Ryzyko wypalenia: {data.burnoutRisk}%</p>
                              <p>Efektywność: {data.efficiency}%</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Scatter dataKey="efficiency" fill="#EF4444" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Individual Member Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Szczegółowa analiza członków</CardTitle>
              <CardDescription>
                Kompleksowy przegląd obciążenia, wydajności i wskaźników ryzyka
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Członek</th>
                      <th className="text-right p-2">Wykorzystanie</th>
                      <th className="text-right p-2">Godziny / Tydzień</th>
                      <th className="text-right p-2">Zadania</th>
                      <th className="text-right p-2">Efektywność</th>
                      <th className="text-right p-2">Ryzyko wypalenia</th>
                      <th className="text-right p-2">Status</th>
                      <th className="text-right p-2">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.memberWorkload.map((member) => (
                      <tr key={member.user.id} className="border-b last:border-b-0">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.user.avatarUrl} />
                              <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.user.name}</div>
                              <div className="text-xs text-muted-foreground">{member.user.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-2">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress
                              value={member.currentWorkload.utilizationRate}
                              className="w-16 h-2"
                            />
                            <span className="text-sm font-medium">
                              {member.currentWorkload.utilizationRate}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right p-2">
                          <div className="text-sm">
                            {member.currentWorkload.hoursWorked.toFixed(1)} / {member.capacity.maxHours}h
                          </div>
                        </td>
                        <td className="text-right p-2">
                          <div className="text-sm">
                            {member.currentWorkload.tasksInProgress} / {member.currentWorkload.tasksAssigned}
                          </div>
                        </td>
                        <td className="text-right p-2">
                          <Badge style={{ backgroundColor: getWorkloadColor(member.currentWorkload.efficiencyScore) }}>
                            {member.currentWorkload.efficiencyScore}%
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          <Badge
                            variant={member.burnoutIndicators.riskLevel === 'high' ? 'destructive' :
                                   member.burnoutIndicators.riskLevel === 'medium' ? 'secondary' : 'outline'}
                          >
                            {member.burnoutIndicators.riskLevel === 'high' ? 'Wysokie' :
                             member.burnoutIndicators.riskLevel === 'medium' ? 'Średnie' : 'Niskie'}
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          <Badge
                            style={{ backgroundColor: getWorkloadColor(member.currentWorkload.utilizationRate) }}
                          >
                            {getWorkloadStatus(member.currentWorkload.utilizationRate)}
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedMember(member.user.id)}
                          >
                            Szczegóły
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {viewType === "trends" && (
        <div className="space-y-6">
          {/* Member Selection for Detailed Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Trendy obciążenia</CardTitle>
              <CardDescription>Analiza trendów dla wybranego członka zespołu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Wybierz członka zespołu" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.memberWorkload.map((member) => (
                      <SelectItem key={member.user.id} value={member.user.id}>
                        {member.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMemberData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Hours Trend */}
                  <div>
                    <h4 className="font-medium mb-2">Dzienny rozkład godzin</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={selectedMemberData.trends.dailyHours}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'dd/MM')} />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: pl })}
                        />
                        <Area dataKey="planned" stackId="1" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.3} name="Planowane" />
                        <Area dataKey="hours" stackId="2" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Rzeczywiste" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Weekly Workload */}
                  <div>
                    <h4 className="font-medium mb-2">Tygodniowe obciążenie</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={selectedMemberData.trends.weeklyWorkload}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="capacity" fill="#E5E7EB" name="Pojemność" />
                        <Line type="monotone" dataKey="workload" stroke="#EF4444" strokeWidth={2} name="Obciążenie" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Workload Distribution Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Rozkład obciążenia zespołu w czasie</CardTitle>
              <CardDescription>Jak zmieniało się obciążenie poszczególnych okresów</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.workloadDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeSlot" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="plannedHours" stroke="#94A3B8" strokeDasharray="5 5" name="Planowane" />
                  <Line type="monotone" dataKey="actualHours" stroke="#3B82F6" strokeWidth={2} name="Rzeczywiste" />
                  <Line type="monotone" dataKey="utilizationRate" stroke="#10B981" strokeWidth={2} name="Wykorzystanie %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {viewType === "predictions" && (
        <div className="space-y-6">
          {/* Next Week Predictions */}
          <Card>
            <CardHeader>
              <CardTitle>Prognozy na następny tydzień</CardTitle>
              <CardDescription>Przewidywane obciążenie i ryzyko dla każdego członka</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.predictions.nextWeekWorkload.map((prediction, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{prediction.user}</div>
                      <Badge variant="outline">Ufność: {prediction.confidence}%</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        Przewidywane: {prediction.predictedHours.toFixed(1)}h
                      </div>
                      <Badge
                        variant={prediction.riskLevel === 'high' ? 'destructive' :
                               prediction.riskLevel === 'medium' ? 'secondary' : 'outline'}
                      >
                        {prediction.riskLevel === 'high' ? 'Wysokie ryzyko' :
                         prediction.riskLevel === 'medium' ? 'Średnie ryzyko' : 'Niskie ryzyko'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Capacity Gaps Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Analiza luk w pojemności</CardTitle>
              <CardDescription>Identyfikacja przyszłych niedoborów i nadwyżek</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.predictions.capacityGaps.map((gap, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{gap.period}</h4>
                      <div className="flex gap-2">
                        {gap.shortfall > 0 && (
                          <Badge variant="destructive">Niedobór: {gap.shortfall}h</Badge>
                        )}
                        {gap.surplus > 0 && (
                          <Badge variant="secondary">Nadwyżka: {gap.surplus}h</Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Rekomendacje:</p>
                      {gap.recommendations.map((rec, i) => (
                        <p key={i} className="text-sm text-muted-foreground">• {rec}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Natychmiastowe działania
            </CardTitle>
            <CardDescription>Pilne rekomendacje wymagające szybkiej implementacji</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recommendations.immediate.map((rec, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={rec.priority === 'high' ? 'destructive' :
                                  rec.priority === 'medium' ? 'secondary' : 'outline'}>
                      {rec.priority === 'high' ? 'Wysoki priorytet' :
                       rec.priority === 'medium' ? 'Średni priorytet' : 'Niski priorytet'}
                    </Badge>
                    <Badge variant="outline">
                      Wysiłek: {rec.effort === 'high' ? 'Wysoki' :
                               rec.effort === 'medium' ? 'Średni' : 'Niski'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mb-1">{rec.action}</p>
                  <p className="text-xs text-muted-foreground">{rec.impact}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Długoterminowe strategie
            </CardTitle>
            <CardDescription>Strategiczne podejście do zarządzania obciążeniem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recommendations.longTerm.map((strategy, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">{strategy.strategy}</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Korzyści:</span>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {strategy.benefits.map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Czas realizacji: {strategy.timeline}</span>
                      <span>Zasoby: {strategy.resources.join(', ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}