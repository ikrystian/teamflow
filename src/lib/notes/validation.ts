import { z } from "zod";

export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_CONTENT_MAX_LENGTH = 200_000;
export const NOTE_GROUP_NAME_MAX_LENGTH = 60;

/** Limity na osobę — panel ładuje całą listę naraz. */
export const MAX_NOTES_PER_USER = 2000;
export const MAX_NOTE_GROUPS_PER_USER = 100;

const id = z.string().trim().min(1).max(64);
const title = z.string().trim().max(NOTE_TITLE_MAX_LENGTH, `Tytuł może mieć najwyżej ${NOTE_TITLE_MAX_LENGTH} znaków`);
/** HTML z edytora Tiptap. */
const content = z.string().max(NOTE_CONTENT_MAX_LENGTH, "Notatka jest za długa");
const groupName = z
  .string()
  .trim()
  .min(1, "Podaj nazwę grupy")
  .max(NOTE_GROUP_NAME_MAX_LENGTH, `Nazwa grupy może mieć najwyżej ${NOTE_GROUP_NAME_MAX_LENGTH} znaków`);

export const createNoteSchema = z.object({
  groupId: id.nullable().optional(),
  title: title.optional(),
  content: content.optional(),
});

export const updateNoteSchema = z
  .object({
    groupId: id.nullable().optional(),
    title: title.optional(),
    content: content.optional(),
  })
  .refine((v) => v.groupId !== undefined || v.title !== undefined || v.content !== undefined, "Brak zmian do zapisania");

export const createNoteGroupSchema = z.object({ name: groupName });

export const updateNoteGroupSchema = z
  .object({
    name: groupName.optional(),
    position: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((v) => v.name !== undefined || v.position !== undefined, "Brak zmian do zapisania");
