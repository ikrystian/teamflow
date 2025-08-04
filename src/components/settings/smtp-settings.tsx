"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [envSettings, setEnvSettings] = useState<SMTPFormData>({
    smtp_host: "",
    smtp_port: "587",
    smtp_secure: false,
    smtp_user: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_from_name: "Nexus"
  })

  // Pobierz obecne ustawienia SMTP z .env
  useEffect(() => {
    const fetchSMTPSettings = async () => {
      try {
        const response = await fetch('/api/admin/smtp-settings')
        if (response.ok) {
          const settings = await response.json()
          setEnvSettings(prev => ({
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



  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
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
          Ustawienia SMTP są teraz konfigurowane przez zmienne środowiskowe (.env)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Informacja o konfiguracji</h4>
            <p className="text-sm text-blue-800 mb-3">
              Ustawienia SMTP zostały przeniesione do pliku <code className="bg-blue-100 px-1 rounded">.env</code>
              dla lepszego bezpieczeństwa i zarządzania środowiskiem.
            </p>
            <p className="text-sm text-blue-800">
              Aby skonfigurować SMTP, edytuj następujące zmienne w pliku <code className="bg-blue-100 px-1 rounded">.env</code>:
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Obecne ustawienia SMTP:</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP_HOST</Label>
                <Input
                  value={envSettings.smtp_host || "Nie skonfigurowane"}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label>SMTP_PORT</Label>
                <Input
                  value={envSettings.smtp_port || "587"}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>SMTP_SECURE</Label>
              <Input
                value={envSettings.smtp_secure ? "true (SSL/TLS)" : "false (STARTTLS)"}
                readOnly
                className="bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP_USER</Label>
                <Input
                  value={envSettings.smtp_user || "Nie skonfigurowane"}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label>SMTP_PASSWORD</Label>
                <Input
                  value={envSettings.smtp_password ? "••••••••" : "Nie skonfigurowane"}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP_FROM_EMAIL</Label>
                <Input
                  value={envSettings.smtp_from_email || "Nie skonfigurowane"}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label>SMTP_FROM_NAME</Label>
                <Input
                  value={envSettings.smtp_from_name || "Nexus"}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !envSettings.smtp_host || !envSettings.smtp_user}
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
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">📝 Przykładowa konfiguracja .env:</h4>
          <div className="bg-gray-800 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
            <div className="space-y-1">
              <div><span className="text-green-400"># SMTP Configuration</span></div>
              <div><span className="text-blue-400">SMTP_HOST</span>=<span className="text-yellow-300">&quot;smtp.gmail.com&quot;</span></div>
              <div><span className="text-blue-400">SMTP_PORT</span>=<span className="text-yellow-300">&quot;587&quot;</span></div>
              <div><span className="text-blue-400">SMTP_SECURE</span>=<span className="text-yellow-300">&quot;false&quot;</span></div>
              <div><span className="text-blue-400">SMTP_USER</span>=<span className="text-yellow-300">&quot;your-email@gmail.com&quot;</span></div>
              <div><span className="text-blue-400">SMTP_PASSWORD</span>=<span className="text-yellow-300">&quot;your-app-password&quot;</span></div>
              <div><span className="text-blue-400">SMTP_FROM_EMAIL</span>=<span className="text-yellow-300">&quot;noreply@yourcompany.com&quot;</span></div>
              <div><span className="text-blue-400">SMTP_FROM_NAME</span>=<span className="text-yellow-300">&quot;Nexus&quot;</span></div>
            </div>
          </div>

          <div className="mt-4">
            <h5 className="font-medium text-gray-900 mb-2">Popularne ustawienia SMTP:</h5>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Gmail:</strong> smtp.gmail.com, port 587, SMTP_SECURE=&quot;false&quot;</div>
              <div><strong>Outlook:</strong> smtp-mail.outlook.com, port 587, SMTP_SECURE=&quot;false&quot;</div>
              <div><strong>Yahoo:</strong> smtp.mail.yahoo.com, port 587, SMTP_SECURE=&quot;false&quot;</div>
              <div><strong>SendGrid:</strong> smtp.sendgrid.net, port 587, SMTP_SECURE=&quot;false&quot;</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
