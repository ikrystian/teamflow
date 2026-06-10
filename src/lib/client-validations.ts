import { z } from "zod"

// Reużywalny schemat pól klienta (dane kontaktowe + notatki)
const clientFields = {
  name: z
    .string()
    .min(1, "Nazwa klienta jest wymagana")
    .min(2, "Nazwa klienta musi mieć co najmniej 2 znaki")
    .max(120, "Nazwa klienta nie może być dłuższa niż 120 znaków")
    .trim(),
  contactPerson: z
    .string()
    .max(120, "Osoba kontaktowa nie może być dłuższa niż 120 znaków")
    .trim()
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Nieprawidłowy adres e-mail")
    .max(160, "Adres e-mail jest zbyt długi")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(40, "Numer telefonu jest zbyt długi")
    .trim()
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .url("Nieprawidłowy adres strony (użyj formatu https://...)")
    .max(200, "Adres strony jest zbyt długi")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(300, "Adres nie może być dłuższy niż 300 znaków")
    .trim()
    .optional()
    .or(z.literal("")),
  taxId: z
    .string()
    .max(40, "NIP nie może być dłuższy niż 40 znaków")
    .trim()
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .max(5000, "Notatki nie mogą być dłuższe niż 5000 znaków")
    .optional()
    .or(z.literal("")),
}

export const createClientSchema = z.object(clientFields)
export const editClientSchema = z.object(clientFields)

export type CreateClientFormData = z.infer<typeof createClientSchema>
export type EditClientFormData = z.infer<typeof editClientSchema>
