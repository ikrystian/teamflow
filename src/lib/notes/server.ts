import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getSession } from "@/lib/auth/session";
import type { NoteDto, NoteGroupDto, NoteSummaryDto } from "./types";

const NO_STORE = { "Cache-Control": "no-store" };

export function notesJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function notesError(error: string, status: number) {
  return notesJson({ error }, status);
}

/** Notatki są prywatne: każda trasa działa wyłącznie na danych zalogowanej osoby. */
export async function requireNotesUser(): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const session = await getSession();
  if (!session?.user) return { ok: false, response: notesError("Unauthorized", 401) };
  return { ok: true, userId: session.user.id };
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, response: notesError(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane", 400) };
  return { ok: true, data: parsed.data };
}

export const noteSummarySelect = { id: true, groupId: true, title: true, excerpt: true, updatedAt: true } as const;
export const noteSelect = { ...noteSummarySelect, content: true, createdAt: true } as const;
export const noteGroupSelect = { id: true, name: true, position: true, createdAt: true } as const;

type SummaryRow = { id: string; groupId: string | null; title: string; excerpt: string; updatedAt: Date };

export function toNoteSummary(row: SummaryRow): NoteSummaryDto {
  return { id: row.id, groupId: row.groupId ?? null, title: row.title, excerpt: row.excerpt, updatedAt: row.updatedAt.toISOString() };
}

export function toNote(row: SummaryRow & { content: string; createdAt: Date }): NoteDto {
  return { ...toNoteSummary(row), content: row.content, createdAt: row.createdAt.toISOString() };
}

export function toNoteGroup(row: { id: string; name: string; position: number; createdAt: Date }): NoteGroupDto {
  return { id: row.id, name: row.name, position: row.position, createdAt: row.createdAt.toISOString() };
}
