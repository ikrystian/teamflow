"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth/use-session"
import type { AppSession as Session } from "@/lib/auth/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingCard } from "@/components/ui/loading-skeleton"
import {
  MapPin,
  Briefcase,
  Globe,
  Calendar,
  CheckSquare,
  Clock,
  MessageSquare,
  TrendingUp,
  ArrowLeft,
  Settings
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePageHeader } from "@/contexts/header-context"
import { PageHeader } from "@/components/dashboard/page-header"
import { getPriorityColor, getPriorityDisplayName, formatProjectDisplay } from "@/lib/task-format-utils"

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
      <PageHeader
        onBack={() => router.back()}
        title={isOwnProfile ? "Twój profil" : userProfile.name}
        description={isOwnProfile ? "Twoje statystyki, zadania i aktywność" : "Profil użytkownika"}
        actions={isOwnProfile ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings?tab=profile">
              <Settings />
              <span className="hidden sm:inline">Edytuj profil</span>
            </Link>
          </Button>
        ) : undefined}
      />
    ) : (
      <PageHeader title="Ładowanie profilu..." />
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


  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6" id="profile-content">
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
      <div className="flex flex-col items-center justify-center py-12 p-4 md:p-6">
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
      color: "text-primary"
    },
    {
      name: "Czas pracy",
      value: `${userProfile.stats.totalHours}h`,
      description: "Łączny czas",
      icon: Clock,
      color: "text-chart-5"
    },
    {
      name: "Komentarze",
      value: userProfile.stats.totalComments.toString(),
      description: "Aktywność w zadaniach",
      icon: MessageSquare,
      color: "text-chart-3"
    }
  ]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6" id="profile-content">
      {/* Profile Header */}
      <Card className="gap-0 overflow-hidden py-0">
        <div className="h-24 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
        <CardContent className="-mt-10 px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <Avatar className="h-20 w-20 shrink-0 ring-4 ring-card">
              <AvatarImage src={userProfile.avatarUrl || ""} />
              <AvatarFallback className="bg-primary/15 text-2xl text-primary">
                {userProfile.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 sm:pt-11">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
                    {userProfile.name}
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">{userProfile.email}</p>
                </div>
                {userProfile.stats.completionRate > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {userProfile.stats.completionRate}% ukończonych
                  </Badge>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {userProfile.jobTitle && (
                  <div className="flex items-center text-[13px] text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                    {userProfile.jobTitle}
                    {userProfile.company && ` w ${userProfile.company}`}
                  </div>
                )}
                {userProfile.location && (
                  <div className="flex items-center text-[13px] text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    {userProfile.location}
                  </div>
                )}
                {userProfile.website && (
                  <div className="flex items-center text-[13px] text-muted-foreground">
                    <Globe className="h-3.5 w-3.5 mr-1.5" />
                    <a
                      href={userProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {userProfile.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center text-[13px] text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Dołączył {formatDate(userProfile.createdAt)}
                </div>
              </div>

              {userProfile.bio && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-sm leading-relaxed text-foreground">{userProfile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {statsConfig.map((stat) => (
          <Card key={stat.name} className="gap-0 py-4">
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">{stat.name}</span>
                <span className="flex size-7 items-center justify-center rounded-md bg-muted">
                  <stat.icon className={`size-3.5 ${stat.color}`} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Zadania</TabsTrigger>
          <TabsTrigger value="activity">Aktywność</TabsTrigger>
          <TabsTrigger value="time">Czas pracy</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="settings">Ustawienia</TabsTrigger>}
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
                <div className="space-y-2">
                  {userProfile.assignedTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent/40">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">

                          {task.priority && (
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {getPriorityDisplayName(task.priority)}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatProjectDisplay(task.project)}
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
                <div className="space-y-2">
                  {userProfile.comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border px-3 py-2.5">
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
                <div className="space-y-2">
                  {userProfile.timeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent/40">
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

        {isOwnProfile && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Settings className="h-5 w-5" />
                  Ustawienia
                </CardTitle>
                <CardDescription>
                  Zarządzaj ustawieniami swojego konta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Brak dostępnych ustawień integracji.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
