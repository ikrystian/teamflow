"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Loader2, Mail, TestTube, CheckCircle, XCircle } from "lucide-react"

interface SMTPFormData {
  smtp_host: string
  smtp_port: string
  smtp_secure: boolean
  smtp_user: string
  smtp_password: string
  smtp_from_email: string
  smtp_from_name: string
}

export function SMTPSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [formData, setFormData] = useState<SMTPFormData>({
    smtp_host: "",
    smtp_port: "587",
    smtp_secure: false,
    smtp_user: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_from_name: "TeamFlow"
  })

  // Pobierz obecne ustawienia SMTP
  useEffect(() => {
    const fetchSMTPSettings = async () => {
      try {
        const response = await fetch('/api/admin/smtp-settings')
        if (response.ok) {
          const settings = await response.json()
          setFormData(prev => ({
            ...prev,
            ...settings
          }))
        }
      } catch (error) {
        console.error('Error fetching SMTP settings:', error)
      }
    }

    fetchSMTPSettings()
  }, [])

  const handleInputChange = (key: keyof SMTPFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
    // Reset test result when settings change
    setTestResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/smtp-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Nie udało się zapisać ustawień SMTP')
      }

      toast.success('Ustawienia SMTP zostały zapisane pomyślnie')
      setTestResult(null) // Reset test result after saving
    } catch (error) {
      console.error('Error saving SMTP settings:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas zapisywania ustawień')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      // Najpierw zapisz ustawienia
      const saveResponse = await fetch('/api/admin/smtp-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!saveResponse.ok) {
        throw new Error('Nie udało się zapisać ustawień przed testem')
      }

      // Następnie przetestuj połączenie
      const testResponse = await fetch('/api/admin/smtp-settings/test', {
        method: 'POST',
      })

      const result = await testResponse.json()
      
      if (testResponse.ok && result.success) {
        setTestResult(true)
        toast.success('Połączenie SMTP działa poprawnie!')
      } else {
        setTestResult(false)
        toast.error(result.error || 'Test połączenia SMTP nie powiódł się')
      }
    } catch (error) {
      console.error('Error testing SMTP connection:', error)
      setTestResult(false)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas testowania połączenia')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Ustawienia SMTP
        </CardTitle>
        <CardDescription>
          Skonfiguruj serwer SMTP do wysyłania maili (powitalnych, resetowania hasła)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">Host SMTP *</Label>
              <Input
                id="smtp_host"
                value={formData.smtp_host}
                onChange={(e) => handleInputChange("smtp_host", e.target.value)}
                placeholder="smtp.gmail.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_port">Port *</Label>
              <Input
                id="smtp_port"
                type="number"
                value={formData.smtp_port}
                onChange={(e) => handleInputChange("smtp_port", e.target.value)}
                placeholder="587"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="smtp_secure"
              checked={formData.smtp_secure}
              onCheckedChange={(checked) => handleInputChange("smtp_secure", checked)}
            />
            <Label htmlFor="smtp_secure">Użyj SSL/TLS (port 465)</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_user">Nazwa użytkownika *</Label>
              <Input
                id="smtp_user"
                type="email"
                value={formData.smtp_user}
                onChange={(e) => handleInputChange("smtp_user", e.target.value)}
                placeholder="your-email@gmail.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_password">Hasło *</Label>
              <Input
                id="smtp_password"
                type="password"
                value={formData.smtp_password}
                onChange={(e) => handleInputChange("smtp_password", e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_from_email">Email nadawcy *</Label>
              <Input
                id="smtp_from_email"
                type="email"
                value={formData.smtp_from_email}
                onChange={(e) => handleInputChange("smtp_from_email", e.target.value)}
                placeholder="noreply@yourcompany.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_from_name">Nazwa nadawcy</Label>
              <Input
                id="smtp_from_name"
                value={formData.smtp_from_name}
                onChange={(e) => handleInputChange("smtp_from_name", e.target.value)}
                placeholder="TeamFlow"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz ustawienia
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !formData.smtp_host || !formData.smtp_user}
            >
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isTesting && <TestTube className="mr-2 h-4 w-4" />}
              Testuj połączenie
            </Button>

            {testResult !== null && (
              <div className="flex items-center gap-2">
                {testResult ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600">Połączenie OK</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-600">Błąd połączenia</span>
                  </>
                )}
              </div>
            )}
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Popularne ustawienia SMTP:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div><strong>Gmail:</strong> smtp.gmail.com, port 587, TLS</div>
            <div><strong>Outlook:</strong> smtp-mail.outlook.com, port 587, TLS</div>
            <div><strong>Yahoo:</strong> smtp.mail.yahoo.com, port 587, TLS</div>
            <div><strong>SendGrid:</strong> smtp.sendgrid.net, port 587, TLS</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
