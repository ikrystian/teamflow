import { z } from "zod";

export const ENV_CONTENT_MAX_LENGTH = 100_000;

/** Nazwa pliku, np. `.env.production` — bez separatorów ścieżek, bo jest też nazwą pobieranego pliku. */
export const envFileNameSchema = z
  .string()
  .trim()
  .min(1, "Podaj nazwę pliku")
  .max(64, "Nazwa pliku może mieć najwyżej 64 znaki")
  .regex(/^[A-Za-z0-9._-]+$/, "Nazwa może zawierać tylko litery, cyfry, kropkę, myślnik i podkreślenie")
  .refine((name) => name !== "." && name !== "..", "Nieprawidłowa nazwa pliku");

export const envContentSchema = z.string().max(ENV_CONTENT_MAX_LENGTH, `Plik może mieć najwyżej ${ENV_CONTENT_MAX_LENGTH} znaków`);

export const createEnvFileSchema = z.object({
  name: envFileNameSchema,
  content: envContentSchema,
});

export const updateEnvFileSchema = z
  .object({
    name: envFileNameSchema.optional(),
    content: envContentSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.content !== undefined, "Brak zmian do zapisania");
