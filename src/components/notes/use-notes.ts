"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import type { NoteDto, NoteGroupDto, NoteSummaryDto, NotesListResponse } from "@/lib/notes/types"
import { api } from "@/lib/vault/api"

export const notesKeys = {
  all: ["notes"] as const,
  list: ["notes", "list"] as const,
  note: (id: string) => ["notes", "note", id] as const,
}

export function useNotesList(enabled: boolean) {
  return useQuery({
    queryKey: notesKeys.list,
    queryFn: () => api<NotesListResponse>("/api/notes"),
    enabled,
  })
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: notesKeys.note(id ?? ""),
    queryFn: async () => (await api<{ note: NoteDto }>(`/api/notes/${encodeURIComponent(id!)}`)).note,
    enabled: Boolean(id),
    retry: false,
  })
}

function toSummary(note: NoteDto): NoteSummaryDto {
  return { id: note.id, groupId: note.groupId, title: note.title, excerpt: note.excerpt, updatedAt: note.updatedAt }
}

/**
 * Operacje na notatkach. Po każdej udanej zmianie aktualizują pamięć podręczną listy
 * i notatki, więc panel nie musi pobierać wszystkiego od nowa. Błędy są rzucane dalej.
 */
export function useNotesActions() {
  const qc = useQueryClient()

  return useMemo(() => {
    const patchList = (fn: (list: NotesListResponse) => NotesListResponse) =>
      qc.setQueryData<NotesListResponse>(notesKeys.list, (list) => (list ? fn(list) : list))

    const storeNote = (note: NoteDto) => {
      qc.setQueryData(notesKeys.note(note.id), note)
      patchList((list) => {
        const exists = list.notes.some((n) => n.id === note.id)
        const notes = exists ? list.notes.map((n) => (n.id === note.id ? toSummary(note) : n)) : [toSummary(note), ...list.notes]
        // Lista jest posortowana od ostatnio zmienionych.
        notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        return { ...list, notes }
      })
    }

    return {
      async createNote(groupId: string | null): Promise<NoteDto> {
        const { note } = await api<{ note: NoteDto }>("/api/notes", { method: "POST", body: JSON.stringify({ groupId }) })
        storeNote(note)
        return note
      },

      async updateNote(id: string, patch: { title?: string; content?: string; groupId?: string | null }): Promise<NoteDto> {
        const { note } = await api<{ note: NoteDto }>(`/api/notes/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        })
        storeNote(note)
        return note
      },

      async deleteNote(id: string): Promise<void> {
        await api(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" })
        qc.removeQueries({ queryKey: notesKeys.note(id) })
        patchList((list) => ({ ...list, notes: list.notes.filter((n) => n.id !== id) }))
      },

      async createGroup(name: string): Promise<NoteGroupDto> {
        const { group } = await api<{ group: NoteGroupDto }>("/api/note-groups", { method: "POST", body: JSON.stringify({ name }) })
        patchList((list) => ({ ...list, groups: [...list.groups, group] }))
        return group
      },

      async renameGroup(id: string, name: string): Promise<NoteGroupDto> {
        const { group } = await api<{ group: NoteGroupDto }>(`/api/note-groups/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        })
        patchList((list) => ({ ...list, groups: list.groups.map((g) => (g.id === id ? group : g)) }))
        return group
      },

      async deleteGroup(id: string): Promise<void> {
        await api(`/api/note-groups/${encodeURIComponent(id)}`, { method: "DELETE" })
        // Notatki z usuniętej grupy trafiają do „Bez grupy”.
        patchList((list) => ({
          groups: list.groups.filter((g) => g.id !== id),
          notes: list.notes.map((n) => (n.groupId === id ? { ...n, groupId: null } : n)),
        }))
        qc.setQueriesData<NoteDto>({ queryKey: ["notes", "note"] }, (note) => (note && note.groupId === id ? { ...note, groupId: null } : note))
      },
    }
  }, [qc])
}
