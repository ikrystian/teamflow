"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error("Wprowadź adres email")
      return
    }

    // Podstawowa walidacja email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error("Wprowadź prawidłowy adres email")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Wystąpił błąd podczas wysyłania maila")
      }

      setIsEmailSent(true)
      toast.success("Link do resetowania hasła został wysłany na Twój email")
    } catch (error) {
      console.error("Error sending reset email:", error)
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd podczas wysyłania maila")
    } finally {
      setIsLoading(false)
    }
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Email został wysłany! 📧</CardTitle>
              <CardDescription>
                Sprawdź swoją skrzynkę pocztową
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Wysłaliśmy link do resetowania hasła na adres:
                </p>
                <p className="font-medium text-blue-600">{email}</p>
                <p className="text-sm text-gray-500">
                  Link będzie aktywny przez 1 godzinę. Jeśli nie widzisz maila, sprawdź folder spam.
                </p>
              </div>

              <div className="pt-4 space-y-3">
                <Button asChild className="w-full">
                  <Link href="/auth/signin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Powrót do logowania
                  </Link>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setIsEmailSent(false)
                    setEmail("")
                  }}
                >
                  Wyślij ponownie
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Nie pamiętasz hasła? 🔐</CardTitle>
            <CardDescription>
              Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adres email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="twoj@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Wyślij link resetujący
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link 
                href="/auth/signin" 
                className="text-sm text-blue-600 hover:text-blue-500 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Powrót do logowania
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Nie masz konta?{" "}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-500">
              Zarejestruj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
