"use client"

import { useState, useEffect, useRef } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { loginSchema, type LoginFormData } from "@/lib/auth-validations"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginFormData>>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const toastShownRef = useRef(false)

  // Sprawdź czy jest komunikat o pomyślnej rejestracji
  useEffect(() => {
    const message = searchParams.get('message')
    if (message && !toastShownRef.current) {
      toastShownRef.current = true
      toast.success(message)
      // Usuń parametr z URL bez przeładowania strony
      const url = new URL(window.location.href)
      url.searchParams.delete('message')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setFieldErrors({})

    // Validate form data
    const validation = loginSchema.safeParse({ email, password })

    if (!validation.success) {
      const errors: Partial<LoginFormData> = {}
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof LoginFormData] = issue.message
        }
      })
      setFieldErrors(errors)
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Nieprawidłowe dane uwierzytelniające")
      } else {
        const session = await getSession()
        if (session) {
          router.push("/dashboard")
        }
      }
    } catch {
      setError("Wystąpił błąd. Spróbuj ponownie.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="flex flex-col items-center text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Zaloguj się do konta
        </h1>
        <p className="text-sm text-muted-foreground">
          Wprowadź swój email poniżej, aby zalogować się do konta
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}

            autoComplete="email"
            className={fieldErrors.email ? "border-destructive" : ""}
          />
          {fieldErrors.email && (
            <p className="text-sm text-destructive">{fieldErrors.email}</p>
          )}
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Hasło</Label>
            <Link
              href="/auth/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Zapomniałeś hasła?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}

            autoComplete="current-password"
            className={fieldErrors.password ? "border-destructive" : ""}
          />
          {fieldErrors.password && (
            <p className="text-sm text-destructive">{fieldErrors.password}</p>
          )}
        </div>
        {error && (
          <div className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Logowanie..." : "Zaloguj się"}
        </Button>
      </div>
      <div className="text-center text-sm">
        Nie masz konta?{" "}
        <Link href="/auth/signup" className="underline underline-offset-4">
          Zarejestruj się
        </Link>
      </div>
    </form>
  )
}
