"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { AvatarUpload } from "@/components/ui/avatar-upload"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

import { Separator } from "@/components/ui/separator"
import {
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Loader2,
  Settings,
  Key,
  Users
} from "lucide-react"
import { useSession } from "next-auth/react"
import { SystemTaskStatuses } from "./system-task-statuses"
import { PasswordChangeForm } from "./password-change-form"
import { ActiveSessions } from "./active-sessions"
import { UserManagement } from "./user-management"

interface UserProfile {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  phone: string | null
  location: string | null
  bio: string | null
  jobTitle: string | null
  company: string | null
  website: string | null
  createdAt: string
  updatedAt: string
}

export function SettingsContent() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin' || session?.user?.email === 'krystian@bpcoders.pl'


  // Form state for profile data
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: "",
    bio: "",
    jobTitle: "",
    company: "",
    website: ""
  })

  // Other settings (mock data for now)
  const [otherSettings, setOtherSettings] = useState({
    notifications: {
      email: true,
      push: true,
      taskAssigned: true,
      taskCompleted: true,
      projectUpdates: true,
      teamInvites: true,
      weeklyReport: false,
      marketing: false
    },
    privacy: {
      profileVisible: true,
      showEmail: false,
      showPhone: false,
      activityVisible: true
    },
    appearance: {
      language: "pl",
      timezone: "Europe/Warsaw"
    }
  })

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoadingProfile(true)
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const profile = await response.json()
          setUserProfile(profile)
          setFormData({
            name: profile.name || "",
            phone: profile.phone || "",
            location: profile.location || "",
            bio: profile.bio || "",
            jobTitle: profile.jobTitle || "",
            company: profile.company || "",
            website: profile.website || ""
          })
        } else {
          console.error('Failed to fetch user profile')
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    if (session?.user) {
      fetchUserProfile()
    }
  }, [session])

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedProfile = await response.json()
        setUserProfile(updatedProfile)
        toast.success('Profil został pomyślnie zaktualizowany!')
      } else {
        const error = await response.json()
        toast.error(`Błąd: ${error.error || 'Nie udało się zaktualizować profilu'}`)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Wystąpił błąd podczas zapisywania profilu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    setOtherSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }))
  }

  const handlePrivacyChange = (key: string, value: boolean) => {
    setOtherSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }))
  }

  const handleFormChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleAvatarChange = (avatarUrl: string | null) => {
    setUserProfile(prev => prev ? {
      ...prev,
      avatarUrl
    } : null)
  }

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Ładowanie profilu...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 bg-white">
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <div id="dynamic-header" className="flex flex-1" >
            {/* Welcome section */}
            <div id="page-header">
              <h1 className="text-2xl font-bold text-gray-900">
                Ustawienia
              </h1>
              <p className="text-sm text-gray-500">
                Zarządzaj swoim profilem i preferencjami aplikacji
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4">

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Bezpieczeństwo
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Powiadomienia
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Prywatność
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Wygląd
            </TabsTrigger>
            <TabsTrigger value="task-statuses" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Statusy zadań
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Użytkownicy
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informacje osobiste
                </CardTitle>
                <CardDescription>
                  Zaktualizuj swoje dane osobowe i informacje kontaktowe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <AvatarUpload
                  currentAvatarUrl={userProfile?.avatarUrl}
                  fallbackText={session?.user?.name?.charAt(0) || "U"}
                  onAvatarChange={handleAvatarChange}
                  size="lg"
                />

                <Separator />

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Imię i nazwisko</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleFormChange("name", e.target.value)}
                      placeholder="Wprowadź imię i nazwisko"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userProfile?.email || ""}
                      disabled
                      placeholder="Adres email nie może być zmieniony"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleFormChange("phone", e.target.value)}
                      placeholder="Wprowadź numer telefonu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lokalizacja</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleFormChange("location", e.target.value)}
                      placeholder="Miasto, Kraj"
                    />
                  </div>
                </div>

                {/* Professional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Stanowisko</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => handleFormChange("jobTitle", e.target.value)}
                      placeholder="Twoje stanowisko"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Firma</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleFormChange("company", e.target.value)}
                      placeholder="Nazwa firmy"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Strona internetowa</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleFormChange("website", e.target.value)}
                    placeholder="https://twoja-strona.pl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">O mnie</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleFormChange("bio", e.target.value)}
                    placeholder="Opowiedz coś o sobie..."
                    rows={4}
                  />
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end pt-4 border-t">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="min-w-[120px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Zapisywanie...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Zapisz zmiany
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <PasswordChangeForm />
            <ActiveSessions />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Powiadomienia
                </CardTitle>
                <CardDescription>
                  Wybierz, o czym chcesz być powiadamiany
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Powiadomienia email</Label>
                      <p className="text-sm text-gray-500">Otrzymuj powiadomienia na email</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.notifications.email}


                      onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Powiadomienia push</Label>
                      <p className="text-sm text-gray-500">Otrzymuj powiadomienia w przeglądarce</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.notifications.push}
                      onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Przypisanie zadania</Label>
                      <p className="text-sm text-gray-500">Gdy zostaniesz przypisany do zadania</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.notifications.taskAssigned}
                      onCheckedChange={(checked) => handleNotificationChange("taskAssigned", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Ukończenie zadania</Label>
                      <p className="text-sm text-gray-500">Gdy zadanie zostanie ukończone</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.notifications.taskCompleted}
                      onCheckedChange={(checked) => handleNotificationChange("taskCompleted", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Aktualizacje projektów</Label>
                      <p className="text-sm text-gray-500">Zmiany w projektach, w których uczestniczysz</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.notifications.projectUpdates}
                      onCheckedChange={(checked) => handleNotificationChange("projectUpdates", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Zaproszenia do zespołu</Label>
                      <p className="text-sm text-gray-500">Gdy zostaniesz zaproszony do zespołu</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.notifications.teamInvites}
                      onCheckedChange={(checked) => handleNotificationChange("teamInvites", checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Raport tygodniowy</Label>
                      <p className="text-sm text-gray-500">Podsumowanie aktywności z tygodnia</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.notifications.weeklyReport}
                      onCheckedChange={(checked) => handleNotificationChange("weeklyReport", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Wiadomości marketingowe</Label>
                      <p className="text-sm text-gray-500">Informacje o nowych funkcjach i aktualizacjach</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.notifications.marketing}
                      onCheckedChange={(checked) => handleNotificationChange("marketing", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Prywatność i bezpieczeństwo
                </CardTitle>
                <CardDescription>
                  Kontroluj widoczność swoich danych i aktywności
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Widoczny profil</Label>
                      <p className="text-sm text-gray-500">Czy inni mogą zobaczyć Twój profil</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.privacy.profileVisible}
                      onCheckedChange={(checked) => handlePrivacyChange("profileVisible", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Pokaż email</Label>
                      <p className="text-sm text-gray-500">Czy inni mogą zobaczyć Twój adres email</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.privacy.showEmail}
                      onCheckedChange={(checked) => handlePrivacyChange("showEmail", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Pokaż telefon</Label>
                      <p className="text-sm text-gray-500">Czy inni mogą zobaczyć Twój numer telefonu</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.privacy.showPhone}
                      onCheckedChange={(checked) => handlePrivacyChange("showPhone", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Widoczna aktywność</Label>
                      <p className="text-sm text-gray-500">Czy inni mogą zobaczyć Twoją aktywność</p>
                    </div>
                    <Switch disabled
                      checked={otherSettings.privacy.activityVisible}
                      onCheckedChange={(checked) => handlePrivacyChange("activityVisible", checked)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Bezpieczeństwo konta</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      Zmień hasło
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Uwierzytelnianie dwuskładnikowe
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Aktywne sesje
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Wygląd i personalizacja
                </CardTitle>
                <CardDescription>
                  Dostosuj wygląd aplikacji do swoich preferencji
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Motyw</Label>
                    <div className="flex gap-2">
                      <Button
                      disabled
                        variant={theme === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("light")}
                      >
                        Jasny
                      </Button>
                      <Button
                      disabled
                        variant={theme === "dark" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("dark")}
                      >
                        Ciemny
                      </Button>
                      <Button
                      disabled
                        variant={theme === "system" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("system")}
                      >
                        Systemowy
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Język</Label>
                    <div className="flex gap-2">
                      <Button
                      disabled
                        variant={otherSettings.appearance.language === "pl" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOtherSettings(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, language: "pl" }
                        }))}
                      >
                        Polski
                      </Button>
                      <Button
                      disabled
                        variant={otherSettings.appearance.language === "en" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOtherSettings(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, language: "en" }
                        }))}
                      >
                        English
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Strefa czasowa</Label>
                    <div className="flex gap-2">
                      <Button
                      disabled
                        variant={otherSettings.appearance.timezone === "Europe/Warsaw" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOtherSettings(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, timezone: "Europe/Warsaw" }
                        }))}
                      >
                        Europa/Warszawa
                      </Button>
                      <Button
                      disabled
                        variant={otherSettings.appearance.timezone === "UTC" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOtherSettings(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, timezone: "UTC" }
                        }))}
                      >
                        UTC
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="task-statuses" className="space-y-6">
            <SystemTaskStatuses />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
