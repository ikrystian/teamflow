"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle, ArrowLeft, Eye, EyeOff, Zap } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  // Waliduj token przy ładowaniu strony
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false)
        setIsValidToken(false)
        return
      }

      try {
        const response = await fetch("/api/auth/validate-reset-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()
        setIsValidToken(response.ok && data.valid)
      } catch (error) {
        console.error("Error validating token:", error)
        setIsValidToken(false)
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Wszystkie pola są wymagane")
      return
    }

    if (newPassword.length < 8) {
      toast.error("Hasło musi mieć co najmniej 8 znaków")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Hasła nie są identyczne")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Wystąpił błąd podczas resetowania hasła")
      }

      setIsPasswordReset(true)
      toast.success("Hasło zostało pomyślnie zresetowane")
    } catch (error) {
      console.error("Error resetting password:", error)
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd podczas resetowania hasła")
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state podczas walidacji tokenu
  if (isValidating) {
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
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Sprawdzanie linku resetującego...</p>
              </div>
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

  // Nieprawidłowy lub wygasły token
  if (!isValidToken) {
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
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Link nieprawidłowy lub wygasły
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Ten link do resetowania hasła jest nieprawidłowy lub już wygasł
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Link do resetowania hasła może być używany tylko raz i jest ważny przez 1 godzinę.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/auth/forgot-password">
                      Wyślij nowy link resetujący
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="w-full">
                    <Link href="/auth/signin">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Powrót do logowania
                    </Link>
                  </Button>
                </div>
              </div>
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

  // Hasło zostało pomyślnie zresetowane
  if (isPasswordReset) {
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
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Hasło zostało zresetowane! ✅
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Możesz teraz zalogować się używając nowego hasła
                  </p>
                </div>

                <Button asChild className="w-full">
                  <Link href="/auth/signin">
                    Przejdź do logowania
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="relative hidden bg-muted lg:block">
          <Image
            src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1920&q=80"
            alt="Password reset success"
            fill
            className="object-cover"
          />
        </div>
      </div>
    )
  }

  // Formularz resetowania hasła
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
                  Ustaw nowe hasło 🔐
                </h1>
                <p className="text-sm text-muted-foreground">
                  Wprowadź nowe hasło dla swojego konta
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">Nowe hasło</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Wprowadź nowe hasło"
                      required
                      disabled={isLoading}
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hasło musi mieć co najmniej 8 znaków
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Potwierdź nowe hasło"
                      required
                      disabled={isLoading}
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zresetuj hasło
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
