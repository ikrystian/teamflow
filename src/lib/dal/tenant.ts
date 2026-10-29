import "server-only";
import { sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";

/**
 * Każde zapytanie do danych przestrzeni działa w transakcji z ustawionym
 * `app.workspace_id` — druga warstwa izolacji (Row Level Security w PostgreSQL).
 * Pierwszą warstwą są jawne filtry `workspaceId` w zapytaniach DAL.
 */
export async function withTenant<T>(workspaceId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.workspace_id', ${workspaceId}, true)`);
    return fn(tx);
  });
}

/**
 * Operacje systemowe bez kontekstu przestrzeni: zadania cykliczne, publiczne linki,
 * rejestracja przestrzeni, lista przestrzeni użytkownika. Używać oszczędnie i zawsze
 * z jawnymi warunkami w zapytaniach.
 */
export async function asSystem<T>(fn: (tx: Tx) => Promise<T>, opts: { auditMaintenance?: boolean } = {}): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.bypass_rls', 'on', true)`);
    if (opts.auditMaintenance) await tx.execute(sql`select set_config('app.audit_maintenance', 'on', true)`);
    return fn(tx);
  });
}
