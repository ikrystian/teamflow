import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { schema } from "@/lib/db";
import type { ClientStatus } from "@/lib/db/schema";
import { WORKSPACE_COOKIE } from "@/lib/dal/session";
import { asSystem } from "@/lib/dal/tenant";
import { orgWorkspaceId } from "@/lib/identity";
import { prisma } from "@/lib/prisma";

/**
 * Katalog klientów CRM dla modułu projektów: tylko metadane (nazwa, status, logo) —
 * dane kontaktowe, notatki i sejf pozostają za uprawnieniami modułu klientów.
 */
export type ClientRef = { id: string; name: string; status: ClientStatus; logo: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isClientId = (id: unknown): id is string => typeof id === "string" && UUID.test(id);

/** Przestrzeń CRM, z której moduł projektów bierze klientów: wybrana przez osobę albo przestrzeń organizacji. */
export async function directoryWorkspaceId(userId: string): Promise<string | null> {
  const memberships = await asSystem((tx) =>
    tx
      .select({ workspaceId: schema.workspaceMembers.workspaceId })
      .from(schema.workspaceMembers)
      .where(and(eq(schema.workspaceMembers.userId, userId), eq(schema.workspaceMembers.status, "active"))),
  );
  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  return memberships.find((m) => m.workspaceId === wanted)?.workspaceId ?? memberships[0]?.workspaceId ?? (await orgWorkspaceId());
}

/** Lista klientów do przypisania projektu (wszyscy klienci przestrzeni, posortowani po nazwie). */
export async function clientDirectory(userId: string): Promise<ClientRef[]> {
  const workspaceId = await directoryWorkspaceId(userId);
  if (!workspaceId) return [];
  return asSystem((tx) =>
    tx
      .select({ id: schema.clients.id, name: schema.clients.name, status: schema.clients.status, logo: schema.clients.logo })
      .from(schema.clients)
      .where(eq(schema.clients.workspaceId, workspaceId))
      .orderBy(asc(schema.clients.name)),
  );
}

/** Czy klient istnieje w przestrzeni, z której dana osoba przypisuje projekty. */
export async function isAssignableClient(userId: string, clientId: string) {
  if (!isClientId(clientId)) return false;
  const workspaceId = await directoryWorkspaceId(userId);
  if (!workspaceId) return false;
  const [row] = await asSystem((tx) =>
    tx.select({ id: schema.clients.id }).from(schema.clients).where(and(eq(schema.clients.id, clientId), eq(schema.clients.workspaceId, workspaceId))),
  );
  return Boolean(row);
}

/** Nazwy klientów po identyfikatorach (do wyświetlania przy projektach). */
export async function clientRefs(ids: (string | null | undefined)[]): Promise<Map<string, ClientRef>> {
  const all = [...new Set(ids.filter((x): x is string => typeof x === "string" && x.length > 0))];
  const unique = all.filter(isClientId);
  const rows = unique.length
    ? await asSystem((tx) =>
        tx
          .select({ id: schema.clients.id, name: schema.clients.name, status: schema.clients.status, logo: schema.clients.logo })
          .from(schema.clients)
          .where(inArray(schema.clients.id, unique)),
      )
    : [];
  const refs = new Map<string, ClientRef>(rows.map((r) => [r.id, r]));
  // Klienci sprzed importu do CRM (kolekcja `Client` w MongoDB) — nazwa widoczna do czasu importu.
  const legacy = all.filter((id) => !isClientId(id));
  if (legacy.length) {
    const res = (await prisma.$runCommandRaw({ find: "Client", filter: { _id: { $in: legacy } }, projection: { name: 1 } })) as {
      cursor?: { firstBatch?: { _id: string; name?: string }[] };
    };
    for (const doc of res.cursor?.firstBatch ?? []) refs.set(doc._id, { id: doc._id, name: doc.name ?? "Klient", status: "active", logo: null });
  }
  return refs;
}

/** Dołącza `client: { id, name }` do projektów (kształt oczekiwany przez interfejs projektów). */
export async function withClientRefs<T extends { clientId?: string | null }>(projects: T[]) {
  const refs = await clientRefs(projects.map((p) => p.clientId));
  return projects.map((p) => {
    const ref = p.clientId ? refs.get(p.clientId) : undefined;
    return { ...p, client: ref ? { id: ref.id, name: ref.name } : null };
  });
}

export async function withClientRef<T extends { clientId?: string | null }>(project: T) {
  return (await withClientRefs([project]))[0];
}
