/** Kształty odpowiedzi /api/notes i /api/note-groups (wspólne dla serwera i przeglądarki). */

export type NoteGroupDto = {
  id: string;
  name: string;
  position: number;
  createdAt: string;
};

export type NoteSummaryDto = {
  id: string;
  groupId: string | null;
  title: string;
  excerpt: string;
  updatedAt: string;
};

export type NoteDto = NoteSummaryDto & {
  content: string;
  createdAt: string;
};

export type NotesListResponse = {
  groups: NoteGroupDto[];
  notes: NoteSummaryDto[];
};
