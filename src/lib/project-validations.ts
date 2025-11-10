import { z } from "zod"

// Create project validation schema
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Nazwa projektu jest wymagana")
    .min(2, "Nazwa projektu musi mieć co najmniej 2 znaki")
    .max(100, "Nazwa projektu nie może być dłuższa niż 100 znaków")
    .trim(),
  description: z
    .string()
    .max(500, "Opis nie może być dłuższy niż 500 znaków")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Nieprawidłowy format koloru")
    .optional(),
  imageUrl: z
    .string()
    .url("Nieprawidłowy URL obrazu")
    .optional()
    .nullable(),
  icon: z
    .string()
    .optional()
    .nullable()
})

// Edit project validation schema
export const editProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Nazwa projektu jest wymagana")
    .min(2, "Nazwa projektu musi mieć co najmniej 2 znaki")
    .max(100, "Nazwa projektu nie może być dłuższa niż 100 znaków")
    .trim(),
  description: z
    .string()
    .max(500, "Opis nie może być dłuższy niż 500 znaków")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Nieprawidłowy format koloru")
    .optional(),
  imageUrl: z
    .string()
    .url("Nieprawidłowy URL obrazu")
    .optional()
    .nullable(),
  icon: z
    .string()
    .optional()
    .nullable()
})

// Export types for TypeScript
export type CreateProjectFormData = z.infer<typeof createProjectSchema>
export type EditProjectFormData = z.infer<typeof editProjectSchema>