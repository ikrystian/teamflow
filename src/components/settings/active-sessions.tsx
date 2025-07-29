"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Monitor,
  Smartphone,
  Loader2,
  LogOut,
  MapPin,
  Calendar,
  AlertTriangle
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Session {
  id: string
  sessionToken: string
  expires: string
  ipAddress: string
  deviceInfo: string
  browserInfo: string
  createdAt: string
  isCurrent: boolean
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTerminating, setIsTerminating] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/user/sessions")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Błąd podczas pobierania sesji")
      }

      setSessions(data.sessions || [])
    } catch (error) {
      console.error("Error fetching sessions:", error)
      toast.error("Nie udało się pobrać listy sesji")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const terminateSession = async (sessionId: string) => {
    setIsTerminating(sessionId)

    try {
      const response = await fetch(`/api/user/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Błąd podczas kończenia sesji")
      }

      toast.success(data.message || "Sesja została zakończona")
      await fetchSessions() // Refresh the list
    } catch (error) {
      console.error("Error terminating session:", error)
      toast.error(error instanceof Error ? error.message : "Nie udało się zakończyć sesji")
    } finally {
      setIsTerminating(null)
    }
  }

  const terminateAllOtherSessions = async () => {
    setIsTerminating("all")

    try {
      const response = await fetch("/api/user/sessions?action=others", {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Błąd podczas kończenia sesji")
      }

      toast.success(data.message || "Wszystkie inne sesje zostały zakończone")
      await fetchSessions() // Refresh the list
    } catch (error) {
      console.error("Error terminating sessions:", error)
      toast.error(error instanceof Error ? error.message : "Nie udało się zakończyć sesji")
    } finally {
      setIsTerminating(null)
    }
  }

  const getDeviceIcon = (deviceInfo: string) => {
    if (deviceInfo.includes("mobilne") || deviceInfo.includes("Mobile")) {
      return <Smartphone className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pl-PL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Aktywne sesje
          </CardTitle>
          <CardDescription>
            Zarządzaj swoimi aktywnymi sesjami logowania
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Ładowanie sesji...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Aktywne sesje
        </CardTitle>
        <CardDescription>
          Zarządzaj swoimi aktywnymi sesjami logowania. Możesz zakończyć sesje na urządzeniach, których już nie używasz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Brak aktywnych sesji
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    {getDeviceIcon(session.deviceInfo)}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {session.browserInfo} na {session.deviceInfo}
                        </span>
                        {session.isCurrent && (
                          <Badge variant="secondary">Obecna sesja</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.ipAddress}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.createdAt)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Wygasa: {formatDate(session.expires)}
                      </div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTerminating === session.id}
                        >
                          {isTerminating === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="h-4 w-4" />
                          )}
                          <span className="ml-2">Zakończ</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Zakończyć sesję?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ta akcja zakończy sesję na urządzeniu &quot;{session.deviceInfo}&quot;
                            z przeglądarką {session.browserInfo}. Użytkownik będzie musiał
                            zalogować się ponownie.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => terminateSession(session.id)}
                          >
                            Zakończ sesję
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>

            {sessions.length > 1 && (
              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={isTerminating === "all"}
                      className="w-full"
                    >
                      {isTerminating === "all" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Kończenie sesji...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Zakończ wszystkie inne sesje
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Zakończyć wszystkie inne sesje?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta akcja zakończy wszystkie sesje oprócz obecnej.
                        Będziesz musiał zalogować się ponownie na wszystkich innych urządzeniach.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={terminateAllOtherSessions}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Zakończ wszystkie inne sesje
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
