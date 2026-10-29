import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { schema, type Tx } from "@/lib/db";
import {
  canEditClients,
  canEditCredentials,
  canViewClient,
  canViewCritical,
  seesAllClients,
  type ClientAssignment,
} from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "./errors";
import type { WorkspaceContext } from "./session";

export type ClientAccess = {
  client: typeof schema.clients.$inferSelect;
  assignment: ClientAssignment;
  canEdit: boolean;
  canEditCrm: boolean;
  canViewCritical: boolean;
};

/**
 * Sprawdza dostęp do klienta. Brak przypisania = 404 (nie 403), żeby nieprzypisany członek
 * zespołu nie dowiedział się nawet, że klient istnieje (rozdział 13, kryterium 3).
 */
export async function getClientAccess(tx: Tx, ctx: WorkspaceContext, clientId: string): Promise<ClientAccess> {
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) throw new NotFoundError("Nie znaleziono klienta");
  const [client] = await tx
    .select()
    .from(schema.clients)
    .where(and(eq(schema.clients.id, clientId), eq(schema.clients.workspaceId, ctx.workspaceId)));
  if (!client) throw new NotFoundError("Nie znaleziono klienta");
  let assignment: ClientAssignment = null;
  const [row] = await tx
    .select({ canViewCritical: schema.clientMembers.canViewCritical })
    .from(schema.clientMembers)
    .where(and(eq(schema.clientMembers.clientId, clientId), eq(schema.clientMembers.userId, ctx.userId)));
  if (row) assignment = { canViewCritical: row.canViewCritical };
  if (!canViewClient(ctx.member, assignment)) throw new NotFoundError("Nie znaleziono klienta");
  return {
    client,
    assignment,
    canEdit: canEditCredentials(ctx.member, assignment),
    canEditCrm: canEditClients(ctx.member) && (seesAllClients(ctx.member) || assignment !== null),
    canViewCritical: canViewCritical(ctx.member, assignment),
  };
}

export async function requireClientEdit(tx: Tx, ctx: WorkspaceContext, clientId: string) {
  const access = await getClientAccess(tx, ctx, clientId);
  if (!access.canEdit) throw new ForbiddenError("Nie możesz edytować dostępów tego klienta");
  return access;
}

export async function requireClientCrmEdit(tx: Tx, ctx: WorkspaceContext, clientId: string) {
  const access = await getClientAccess(tx, ctx, clientId);
  if (!access.canEditCrm) throw new ForbiddenError("Nie możesz edytować danych tego klienta");
  return access;
}

/** Identyfikatory klientów widocznych dla osoby (wszyscy albo przypisani). */
export async function visibleClientIds(tx: Tx, ctx: WorkspaceContext): Promise<string[] | "all"> {
  if (seesAllClients(ctx.member)) return "all";
  const rows = await tx
    .select({ clientId: schema.clientMembers.clientId })
    .from(schema.clientMembers)
    .where(and(eq(schema.clientMembers.workspaceId, ctx.workspaceId), eq(schema.clientMembers.userId, ctx.userId)));
  return rows.map((r) => r.clientId);
}

/** Wpis + dostęp do jego klienta lub bezpośrednie udostępnienie wpisu. */
export async function getCredentialAccess(tx: Tx, ctx: WorkspaceContext, credentialId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(credentialId)) throw new NotFoundError("Nie znaleziono wpisu");
  const [cred] = await tx
    .select()
    .from(schema.credentials)
    .where(and(eq(schema.credentials.id, credentialId), eq(schema.credentials.workspaceId, ctx.workspaceId), isNull(schema.credentials.deletedAt)));
  if (!cred) throw new NotFoundError("Nie znaleziono wpisu");
  try {
    const access = await getClientAccess(tx, ctx, cred.clientId);
    return { cred, access, direct: false as const };
  } catch (e) {
    if (!(e instanceof NotFoundError)) throw e;
    const [direct] = await tx
      .select()
      .from(schema.credentialAccess)
      .where(and(eq(schema.credentialAccess.credentialId, credentialId), eq(schema.credentialAccess.userId, ctx.userId)));
    if (!direct) throw new NotFoundError("Nie znaleziono wpisu");
    // Bezpośrednie udostępnienie: tylko odczyt; wpisy krytyczne zgodnie z rolą.
    return { cred, access: null, direct: true as const };
  }
}
