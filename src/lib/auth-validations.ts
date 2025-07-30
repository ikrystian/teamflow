import { z } from "zod"

// Login form validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Nieprawidłowy format email"),
  password: z
    .string()
    .min(1, "Hasło jest wymagane")
    .min(6, "Hasło musi mieć co najmniej 6 znaków")
})

// Signup form validation schema
export const signupSchema = z.object({
  name: z
    .string()
    .min(1, "Imię i nazwisko jest wymagane")
    .min(2, "Imię i nazwisko musi mieć co najmniej 2 znaki")
    .max(50, "Imię i nazwisko nie może być dłuższe niż 50 znaków"),
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Nieprawidłowy format email"),
  password: z
    .string()
    .min(1, "Hasło jest wymagane")
    .min(6, "Hasło musi mieć co najmniej 6 znaków")
    .max(100, "Hasło nie może być dłuższe niż 100 znaków")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Hasło musi zawierać co najmniej jedną małą literę, jedną wielką literę i jedną cyfrę"),
  confirmPassword: z
    .string()
    .min(1, "Potwierdzenie hasła jest wymagane")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła nie pasują do siebie",
  path: ["confirmPassword"],
})

// Export types for TypeScript
export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>