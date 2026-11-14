import { z } from "zod"

// The image selector yields a data URL for a freshly cropped picture (the API
// stores it as a file). A project that already has an image carries its link
// instead: /uploads/projects/... or, in old records, an external URL.
const projectImageSchema = z
  .string()
  .regex(/^(data:image\/|\/|https?:\/\/)/i, "Nieprawidłowy obraz projektu")
  .optional()
  .nullable()

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
  imageUrl: projectImageSchema,
  icon: z
    .string()
    .optional()
    .nullable(),
  clientId: z
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
  imageUrl: projectImageSchema,
  icon: z
    .string()
    .optional()
    .nullable(),
  clientId: z
    .string()
    .optional()
    .nullable()
})

// Export types for TypeScript
export type CreateProjectFormData = z.infer<typeof createProjectSchema>
export type EditProjectFormData = z.infer<typeof editProjectSchema>