"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Mail, ArrowLeft, Zap } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

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
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <Link href="/" className="flex items-center gap-2 font-medium">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Zap className="size-4" />
              </div>
              TeamFlow
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Email został wysłany! 📧
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Sprawdź swoją skrzynkę pocztową
                  </p>
                </div>

                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Wysłaliśmy link do resetowania hasła na adres:
                  </p>
                  <p className="font-medium text-primary">{email}</p>
                  <p className="text-sm text-muted-foreground">
                    Link będzie aktywny przez 1 godzinę. Jeśli nie widzisz maila, sprawdź folder spam.
                  </p>
                </div>

                <div className="space-y-3">
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
              </div>
            </div>
          </div>
        </div>
        <div className="relative hidden bg-muted lg:block">
          <Image
            src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1920&q=80"
            alt="Email sent"
            fill
            className="object-cover"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Zap className="size-4" />
            </div>
            TeamFlow
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Nie pamiętasz hasła? 🔐
                </h1>
                <p className="text-sm text-muted-foreground">
                  Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
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
              </div>

              <div className="text-center text-sm">
                <Link
                  href="/auth/signin"
                  className="text-muted-foreground hover:text-primary flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Powrót do logowania
                </Link>
              </div>

              <div className="text-center text-sm">
                Nie masz konta?{" "}
                <Link href="/auth/signup" className="underline underline-offset-4">
                  Zarejestruj się
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1920&q=80"
          alt="Password reset"
          fill
          className="object-cover"
        />
      </div>
    </div>
  )
}
