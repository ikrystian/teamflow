"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, AlertCircle } from "lucide-react"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface ReminderSettingsProps {
  reminderEnabled: boolean
  reminderType: string
  reminderValue: number
  dueDate?: string
  onReminderChange: (enabled: boolean, type: string, value: number) => void
}

export function ReminderSettings({
  reminderEnabled,
  reminderType,
  reminderValue,
  dueDate,
  onReminderChange
}: ReminderSettingsProps) {
  const [localEnabled, setLocalEnabled] = useState(reminderEnabled)
  const [localType, setLocalType] = useState(reminderType || "hours")
  const [localValue, setLocalValue] = useState(reminderValue || 1)
  
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe
  } = usePushNotifications()

  useEffect(() => {
    setLocalEnabled(reminderEnabled)
    setLocalType(reminderType || "hours")
    setLocalValue(reminderValue || 1)
  }, [reminderEnabled, reminderType, reminderValue])

  const handleEnabledChange = async (enabled: boolean) => {
    if (enabled && !isSupported) {
      toast.error("Twoja przeglądarka nie obsługuje powiadomień push")
      return
    }

    if (enabled && permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        toast.error("Musisz zezwolić na powiadomienia, aby włączyć przypomnienia")
        return
      }
    }

    if (enabled && !isSubscribed) {
      const subscription = await subscribe()
      if (!subscription) {
        toast.error("Nie udało się skonfigurować powiadomień")
        return
      }
    }

    if (enabled && !dueDate) {
      toast.error("Musisz ustawić termin wykonania zadania, aby włączyć przypomnienie")
      return
    }

    setLocalEnabled(enabled)
    onReminderChange(enabled, localType, localValue)
  }

  const handleTypeChange = (type: string) => {
    setLocalType(type)
    onReminderChange(localEnabled, type, localValue)
  }

  const handleValueChange = (value: string) => {
    const numValue = parseInt(value) || 1
    setLocalValue(numValue)
    onReminderChange(localEnabled, localType, numValue)
  }

  const getReminderTimeText = () => {
    if (!localEnabled || !dueDate) return ""
    
    const due = new Date(dueDate)
    const reminderTime = new Date(due)
    
    if (localType === "hours") {
      reminderTime.setHours(reminderTime.getHours() - localValue)
    } else {
      reminderTime.setDate(reminderTime.getDate() - localValue)
    }
    
    return `Przypomnienie zostanie wysłane: ${reminderTime.toLocaleString('pl-PL')}`
  }

  if (!isSupported) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
            <AlertCircle className="h-4 w-4" />
            Powiadomienia niedostępne
          </CardTitle>
          <CardDescription className="text-orange-600">
            Twoja przeglądarka nie obsługuje powiadomień push
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Przypomnienie o zadaniu
        </CardTitle>
        <CardDescription>
          Otrzymaj powiadomienie push przed terminem wykonania zadania
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Włącz przypomnienie</Label>
            <p className="text-xs text-muted-foreground">
              Powiadomienie zostanie wysłane w przeglądarce
            </p>
          </div>
          <Switch
            checked={localEnabled}
            onCheckedChange={handleEnabledChange}
            disabled={isLoading || !dueDate}
          />
        </div>

        {localEnabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="reminderValue" className="text-xs">Ile wcześniej</Label>
                <Input
                  id="reminderValue"
                  type="number"
                  min="1"
                  max={localType === "hours" ? 168 : 30}
                  value={localValue}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className="h-8"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reminderType" className="text-xs">Jednostka</Label>
                <Select value={localType} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Godzin</SelectItem>
                    <SelectItem value="days">Dni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dueDate && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                {getReminderTimeText()}
              </div>
            )}

            {permission !== 'granted' && (
              <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                <AlertCircle className="h-3 w-3" />
                <span>Wymagane zezwolenie na powiadomienia</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestPermission}
                  className="h-6 text-xs"
                >
                  Zezwól
                </Button>
              </div>
            )}
          </>
        )}

        {!dueDate && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Ustaw termin wykonania zadania, aby włączyć przypomnienie
          </div>
        )}
      </CardContent>
    </Card>
  )
}
