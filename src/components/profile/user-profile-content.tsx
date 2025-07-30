"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {  LoadingCard } from "@/components/ui/loading-skeleton"
import {
  MapPin,
  Briefcase,
  Globe,
  Calendar,
  CheckSquare,
  Clock,
  MessageSquare,
  Users,
  TrendingUp,
  ArrowLeft
} from "lucide-react"
import { useRouter } from "next/navigation"
import { usePageHeader } from "@/contexts/header-context"

interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  location: string | null
  bio: string | null
  jobTitle: string | null
  company: string | null
  website: string | null
  createdAt: string
  teams: Array<{
    id: string
    name: string
    createdAt: string
  }>
  assignedTasks: Array<{
    id: string
    title: string
    status: string
    priority: string | null
    dueDate: string | null
    createdAt: string
    project: {
      id: string
      name: string
      team: {
        id: string
        name: string
      }
    }
  }>
  createdTasks: Array<{
    id: string
    title: string
    status: string
    createdAt: string
  }>
  comments: Array<{
    id: string
    content: string
    createdAt: string
    task: {
      id: string
      title: string
      project: {
        id: string
        name: string
      }
    }
  }>
  timeEntries: Array<{
    id: string
    hours: number
    date: string
    description: string | null
    task: {
      id: string
      title: string
      project: {
        id: string
        name: string
      }
    }
  }>
  stats: {
    totalAssignedTasks: number
    completedTasks: number
    totalHours: number
    totalComments: number
    completionRate: number
    teamsCount: number
  }
}

interface UserProfileContentProps {
  userId: string
}

export function UserProfileContent({ userId }: UserProfileContentProps) {
  const { data: session } = useSession() as { data: Session | null }
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isOwnProfile = session?.user?.id === userId

  // Set page header content - must be called before any conditional returns
  usePageHeader(
    userProfile ? (
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isOwnProfile ? "Twój profil" : `Profil: ${userProfile.name}`}
          </h1>
        </div>
      </div>
    ) : (
      <div>
        <h1 className="text-xl font-bold text-foreground">Ładowanie profilu...</h1>
      </div>
    ),
    [userProfile, isOwnProfile]
  )

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${userId}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError("Użytkownik nie został znaleziony")
          } else if (response.status === 401) {
            setError("Brak uprawnień do wyświetlenia tego profilu")
          } else {
            setError("Wystąpił błąd podczas ładowania profilu")
          }
          return
        }

        const profile = await response.json()
        setUserProfile(profile)
      } catch (error) {
        console.error("Error fetching user profile:", error)
        setError("Wystąpił błąd podczas ładowania profilu")
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchUserProfile()
    }
  }, [userId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }


  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8 pt-6">
        <LoadingCard className="max-w-4xl" headerLines={3} contentLines={5} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} headerLines={1} contentLines={2} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 p-4 md:p-8">
        <h3 className="text-lg font-medium text-foreground mb-2">Błąd</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć
        </Button>
      </div>
    )
  }



  const statsConfig = [
    {
      name: "Zadania",
      value: userProfile.stats.totalAssignedTasks.toString(),
      description: `${userProfile.stats.completedTasks} ukończonych`,
      icon: CheckSquare,
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      name: "Zespoły",
      value: userProfile.stats.teamsCount.toString(),
      description: "Członkostwo w zespołach",
      icon: Users,
      color: "text-green-600 dark:text-green-400"
    },
    {
      name: "Czas pracy",
      value: `${userProfile.stats.totalHours}h`,
      description: "Łączny czas",
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400"
    },
    {
      name: "Komentarze",
      value: userProfile.stats.totalComments.toString(),
      description: "Aktywność w zadaniach",
      icon: MessageSquare,
      color: "text-orange-600 dark:text-orange-400"
    }
  ]

  return (
    <div className="space-y-6 p-4 md:p-8 pt-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={userProfile.avatarUrl || ""} />
                    <AvatarFallback className="text-2xl">
                      {userProfile.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">
                          {userProfile.name}
                        </h2>
                        <p className="text-muted-foreground">{userProfile.email}</p>
                      </div>
                      {userProfile.stats.completionRate > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {userProfile.stats.completionRate}% ukończonych
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      {userProfile.jobTitle && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Briefcase className="h-4 w-4 mr-2" />
                          {userProfile.jobTitle}
                          {userProfile.company && ` w ${userProfile.company}`}
                        </div>
                      )}
                      {userProfile.location && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          {userProfile.location}
                        </div>
                      )}
                      {userProfile.website && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Globe className="h-4 w-4 mr-2" />
                          <a
                            href={userProfile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {userProfile.website}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        Dołączył {formatDate(userProfile.createdAt)}
                      </div>
                    </div>

                    {userProfile.bio && (
                      <div className="mt-4">
                        <p className="text-sm text-foreground">{userProfile.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statsConfig.map((stat) => (
                <Card key={stat.name}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-muted-foreground truncate">
                            {stat.name}
                          </dt>
                          <dd className="text-lg font-medium text-foreground">
                            {stat.value}
                          </dd>
                        </dl>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm text-muted-foreground">
                        {stat.description}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Activity Tabs */}
            <Tabs defaultValue="tasks" className="space-y-4">
              <TabsList>
                <TabsTrigger value="tasks">Zadania</TabsTrigger>
                <TabsTrigger value="teams">Zespoły</TabsTrigger>
                <TabsTrigger value="activity">Aktywność</TabsTrigger>
                <TabsTrigger value="time">Czas pracy</TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Przypisane zadania</CardTitle>
                    <CardDescription>
                      Ostatnie zadania przypisane do użytkownika
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userProfile.assignedTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Brak przypisanych zadań
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {userProfile.assignedTasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{task.title}</h4>
                              <div className="flex items-center gap-2 mt-1">

                                {task.priority && (
                                  <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {task.project.team.name} • {task.project.name}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {task.dueDate ? formatDate(task.dueDate) : formatDate(task.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="teams" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Zespoły</CardTitle>
                    <CardDescription>
                      Zespoły, do których należy użytkownik
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userProfile.teams.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Brak zespołów
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userProfile.teams.map((team) => (
                          <div key={team.id} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <h4 className="font-medium">{team.name}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Dołączył {formatDate(team.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ostatnie komentarze</CardTitle>
                    <CardDescription>
                      Najnowsze komentarze użytkownika
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userProfile.comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Brak komentarzy
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {userProfile.comments.map((comment) => (
                          <div key={comment.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm">{comment.content}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    {comment.task.project.name} • {comment.task.title}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(comment.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="time" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Wpisy czasu pracy</CardTitle>
                    <CardDescription>
                      Ostatnie wpisy czasu pracy użytkownika
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userProfile.timeEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Brak wpisów czasu pracy
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {userProfile.timeEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{entry.hours}h</span>
                                <span className="text-sm text-muted-foreground">
                                  {entry.task.project.name} • {entry.task.title}
                                </span>
                              </div>
                              {entry.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {entry.description}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(entry.date)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
    </div>
  )
}
