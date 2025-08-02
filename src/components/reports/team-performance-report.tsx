"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ComposedChart,
  Area,
  AreaChart
} from "recharts"
import {
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Clock,
  CheckSquare,
  AlertCircle,
  Star,
  Zap,
  Activity
} from "lucide-react"
import { format } from "date-fns"
import { pl } from "date-fns/locale"

interface TeamPerformanceReportProps {
  filters: {
    startDate: string
    endDate: string
    projectId: string
    userId: string
    teamId: string
  }
  onDataLoaded?: (data: TeamPerformanceData) => void
}

export interface TeamPerformanceData {
  teamOverview: {
    totalMembers: number
    activeMembers: number
    totalTasksCompleted: number
    totalHoursLogged: number
    averageProductivity: number
    teamVelocity: number
    collaborationScore: number
    qualityScore: number
  }
  memberPerformance: Array<{
    user: {
      id: string
      name: string
      email: string
      avatarUrl?: string
      role: string
    }
    metrics: {
      tasksCompleted: number
      hoursLogged: number
      productivity: number
      velocity: number
      quality: number
      collaboration: number
      consistency: number
      onTimeDelivery: number
    }
    trends: {
      weeklyProgress: Array<{ week: string; tasks: number; hours: number }>
      productivityTrend: Array<{ date: string; score: number }>
    }
    strengths: string[]
    improvementAreas: string[]
  }>
  teamCollaboration: Array<{
    fromUser: string
    toUser: string
    collaborationIndex: number
    sharedTasks: number
    communicationFrequency: number
  }>
  skillsMatrix: Array<{
    skill: string
    members: Array<{
      userId: string
      userName: string
      proficiency: number
      experience: number
    }>
  }>
  performanceComparison: Array<{
    metric: string
    teamAverage: number
    industryBenchmark: number
    previousPeriod: number
  }>
  workload: Array<{
    user: string
    currentLoad: number
    capacity: number
    efficiency: number
    burnoutRisk: number
  }>
  milestones: Array<{
    date: string
    achievement: string
    impact: "high" | "medium" | "low"
    teamMembers: string[]
  }>
}

const PERFORMANCE_COLORS = {
  excellent: '#10B981',
  good: '#3B82F6', 
  average: '#F59E0B',
  poor: '#EF4444'
}

const SKILL_LEVELS = {
  1: { label: 'Początkujący', color: '#EF4444' },
  2: { label: 'Podstawowy', color: '#F59E0B' },
  3: { label: 'Średnio zaawansowany', color: '#3B82F6' },
  4: { label: 'Zaawansowany', color: '#10B981' },
  5: { label: 'Ekspert', color: '#8B5CF6' }
}

export function TeamPerformanceReport({ filters, onDataLoaded }: TeamPerformanceReportProps) {
  const [data, setData] = useState<TeamPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<string>("")
  const [comparisonPeriod, setComparisonPeriod] = useState<"1m" | "3m" | "6m">("3m")

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        comparisonPeriod,
        reportType: 'team-performance'
      })

      const response = await fetch(`/api/reports/team-performance?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch team performance data')
      }

      const result = await response.json()
      setData(result)
      onDataLoaded?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filters, comparisonPeriod])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
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
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error || 'Brak danych'}</p>
          <Button onClick={fetchData} className="mt-4">Spróbuj ponownie</Button>
        </CardContent>
      </Card>
    )
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return PERFORMANCE_COLORS.excellent
    if (score >= 75) return PERFORMANCE_COLORS.good
    if (score >= 60) return PERFORMANCE_COLORS.average
    return PERFORMANCE_COLORS.poor
  }

  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return 'Doskonały'
    if (score >= 75) return 'Dobry'
    if (score >= 60) return 'Średni'
    return 'Wymaga poprawy'
  }

  const selectedMemberData = selectedMember 
    ? data.memberPerformance.find(m => m.user.id === selectedMember)
    : null

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Wydajność zespołu</h2>
        <div className="flex gap-2">
          <Select value={comparisonPeriod} onValueChange={(value: "1m" | "3m" | "6m") => setComparisonPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Ostatni miesiąc</SelectItem>
              <SelectItem value="3m">Ostatnie 3 miesiące</SelectItem>
              <SelectItem value="6m">Ostatnie 6 miesięcy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktywni członkowie</p>
                <p className="text-2xl font-bold">{data.teamOverview.activeMembers}/{data.teamOverview.totalMembers}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round((data.teamOverview.activeMembers / data.teamOverview.totalMembers) * 100)}% aktywności
                  </span>
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
                <p className="text-sm font-medium text-muted-foreground">Średnia wydajność</p>
                <p className="text-2xl font-bold">{data.teamOverview.averageProductivity}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <Target className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">{getPerformanceLabel(data.teamOverview.averageProductivity)}</span>
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
                <p className="text-sm font-medium text-muted-foreground">Prędkość zespołu</p>
                <p className="text-2xl font-bold">{data.teamOverview.teamVelocity}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">zadań/tydzień</span>
                </div>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jakość pracy</p>
                <p className="text-2xl font-bold">{data.teamOverview.qualityScore}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-purple-600">Wysoka jakość</span>
                </div>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Wydajność</TabsTrigger>
          <TabsTrigger value="skills">Umiejętności</TabsTrigger>
          <TabsTrigger value="collaboration">Współpraca</TabsTrigger>
          <TabsTrigger value="workload">Obciążenie</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Member Performance Radar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Radar wydajności członków</CardTitle>
                <CardDescription>Wielowymiarowa analiza wydajności</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz członka zespołu" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.memberPerformance.map((member) => (
                        <SelectItem key={member.user.id} value={member.user.id}>
                          {member.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedMemberData && (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={[
                      { metric: 'Produktywność', value: selectedMemberData.metrics.productivity },
                      { metric: 'Jakość', value: selectedMemberData.metrics.quality },
                      { metric: 'Współpraca', value: selectedMemberData.metrics.collaboration },
                      { metric: 'Punktualność', value: selectedMemberData.metrics.onTimeDelivery },
                      { metric: 'Konsystencja', value: selectedMemberData.metrics.consistency },
                      { metric: 'Prędkość', value: selectedMemberData.metrics.velocity }
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Porównanie z benchmarkami</CardTitle>
                <CardDescription>Zespół vs średnia branżowa</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.performanceComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="teamAverage" fill="#3B82F6" name="Zespół" />
                    <Bar dataKey="industryBenchmark" fill="#10B981" name="Benchmark" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Individual Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Szczegółowa wydajność członków</CardTitle>
              <CardDescription>Kompleksowy przegląd metryk wydajności</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Członek</th>
                      <th className="text-right p-2">Zadania</th>
                      <th className="text-right p-2">Godziny</th>
                      <th className="text-right p-2">Produktywność</th>
                      <th className="text-right p-2">Jakość</th>
                      <th className="text-right p-2">Współpraca</th>
                      <th className="text-right p-2">Punktualność</th>
                      <th className="text-right p-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.memberPerformance.map((member) => (
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
                        <td className="text-right p-2">{member.metrics.tasksCompleted}</td>
                        <td className="text-right p-2">{member.metrics.hoursLogged.toFixed(1)}h</td>
                        <td className="text-right p-2">
                          <Badge style={{ backgroundColor: getPerformanceColor(member.metrics.productivity) }}>
                            {member.metrics.productivity}%
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          <Badge style={{ backgroundColor: getPerformanceColor(member.metrics.quality) }}>
                            {member.metrics.quality}%
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          <Badge style={{ backgroundColor: getPerformanceColor(member.metrics.collaboration) }}>
                            {member.metrics.collaboration}%
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          <Badge style={{ backgroundColor: getPerformanceColor(member.metrics.onTimeDelivery) }}>
                            {member.metrics.onTimeDelivery}%
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          {member.trends.productivityTrend.length > 1 && (
                            <div className="flex items-center justify-end">
                              {member.trends.productivityTrend[member.trends.productivityTrend.length - 1].score > 
                               member.trends.productivityTrend[0].score ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          {/* Skills Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Macierz umiejętności zespołu</CardTitle>
              <CardDescription>Przegląd kompetencji i poziomów zaawansowania</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.skillsMatrix.map((skill) => (
                  <div key={skill.skill} className="space-y-2">
                    <h4 className="font-medium">{skill.skill}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {skill.members.map((member) => (
                        <div key={member.userId} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">{member.userName}</span>
                          <div className="flex items-center gap-2">
                            <Badge 
                              style={{ backgroundColor: SKILL_LEVELS[member.proficiency as keyof typeof SKILL_LEVELS]?.color }}
                            >
                              {SKILL_LEVELS[member.proficiency as keyof typeof SKILL_LEVELS]?.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{member.experience}y</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-6">
          {/* Team Collaboration Network */}
          <Card>
            <CardHeader>
              <CardTitle>Sieć współpracy zespołu</CardTitle>
              <CardDescription>Jak członkowie zespołu współpracują ze sobą</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.teamCollaboration.map((collab, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium">{collab.fromUser}</div>
                      <div className="text-muted-foreground">↔</div>
                      <div className="text-sm font-medium">{collab.toUser}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground">
                        {collab.sharedTasks} wspólnych zadań
                      </div>
                      <Badge variant="outline">
                        Współpraca: {collab.collaborationIndex}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workload" className="space-y-6">
          {/* Workload Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Analiza obciążenia zespołu</CardTitle>
              <CardDescription>Bieżące obciążenie i ryzyko wypalenia</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={data.workload}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="currentLoad" name="Obecne obciążenie" />
                  <YAxis dataKey="efficiency" name="Efektywność" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white border rounded p-2 shadow">
                            <p className="font-medium">{data.user}</p>
                            <p>Obciążenie: {data.currentLoad}%</p>
                            <p>Efektywność: {data.efficiency}%</p>
                            <p>Ryzyko wypalenia: {data.burnoutRisk}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Scatter dataKey="burnoutRisk" fill="#EF4444" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Insights and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mocne strony zespołu</CardTitle>
                <CardDescription>Co zespół robi dobrze</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.memberPerformance.flatMap(m => m.strengths).slice(0, 5).map((strength, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{strength}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Obszary do poprawy</CardTitle>
                <CardDescription>Na czym zespół powinien się skupić</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.memberPerformance.flatMap(m => m.improvementAreas).slice(0, 5).map((area, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{area}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Milestones */}
          <Card>
            <CardHeader>
              <CardTitle>Ostatnie osiągnięcia</CardTitle>
              <CardDescription>Ważne kamienie milowe zespołu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.milestones.map((milestone, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                    <Award className={`h-6 w-6 mt-1 ${
                      milestone.impact === 'high' ? 'text-green-500' : 
                      milestone.impact === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{milestone.achievement}</h4>
                        <Badge variant={
                          milestone.impact === 'high' ? 'default' : 
                          milestone.impact === 'medium' ? 'secondary' : 'outline'
                        }>
                          {milestone.impact === 'high' ? 'Wysoki wpływ' : 
                           milestone.impact === 'medium' ? 'Średni wpływ' : 'Niski wpływ'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(milestone.date), 'dd MMMM yyyy', { locale: pl })}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {milestone.teamMembers.slice(0, 3).map((member, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {member}
                          </Badge>
                        ))}
                        {milestone.teamMembers.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{milestone.teamMembers.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}