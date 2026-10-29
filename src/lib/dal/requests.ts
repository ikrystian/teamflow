import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { schema } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/email";
import { canRequestAccess } from "@/lib/permissions";
import { hit } from "@/lib/security/rate-limit";
import type { RequestMeta } from "@/lib/request-meta";
import { TYPE_DEFS } from "@/lib/vault/types";
import type { accessRequestCreateSchema, intakeSubmitSchema } from "@/lib/validation";
import { getClientAccess, visibleClientIds } from "./access";
import { recordAudit } from "./audit";
import { ConflictError, ForbiddenError, GoneError, NotFoundError } from "./errors";
import { notifyManagers, notifyUsers } from "./notifications";
import type { WorkspaceContext } from "./session";
import { asSystem, withTenant } from "./tenant";

async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Prośba o dostępy od klienta (rozdział 4.6): link do formularza, w którym dane szyfrują się
 * w przeglądarce klienta kluczem publicznym skrzynki „Do przejrzenia”.
 */
export async function createAccessRequest(ctx: WorkspaceContext, input: z.infer<typeof accessRequestCreateSchema>) {
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  const { id, clientName } = await withTenant(ctx.workspaceId, async (tx) => {
    const access = await getClientAccess(tx, ctx, input.clientId);
    if (!canRequestAccess(ctx.member, access.assignment)) throw new ForbiddenError();
    const [row] = await tx
      .insert(schema.accessRequests)
      .values({
        workspaceId: ctx.workspaceId,
        clientId: input.clientId,
        tokenHash: await sha256Hex(token),
        requestedTypes: input.requestedTypes,
        message: input.message,
        recipientEmail: input.recipientEmail,
        expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
        createdBy: ctx.userId,
      })
      .returning({ id: schema.accessRequests.id });
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "request.create", targetType: "access_request", targetId: row.id, clientId: input.clientId, metadata: { types: input.requestedTypes } }, tx);
    return { id: row.id, clientName: access.client.name };
  });
  // Odcisk klucza skrzynki w fragmencie adresu przypina klucz — serwer nie podmieni go niezauważenie.
  const url = appUrl(`/request/${token}#pk=${ctx.intakePublicKey}`);
  if (input.recipientEmail) {
    await sendEmail(input.recipientEmail, `${ctx.workspaceName}: prośba o przekazanie dostępów`, {
      preview: "Bezpieczny formularz przekazania dostępów",
      title: "Prośba o przekazanie dostępów",
      paragraphs: [
        `${ctx.userName} z ${ctx.workspaceName} prosi o przekazanie dostępów dla: ${clientName}.`,
        `Potrzebne: ${input.requestedTypes.map((t) => TYPE_DEFS[t].label).join(", ")}.`,
        "Dane wpiszesz w bezpiecznym formularzu — zostaną zaszyfrowane w Twojej przeglądarce, zanim opuszczą komputer. Prosimy nie wysyłać haseł e-mailem.",
        ...(input.message ? [`Wiadomość: ${input.message}`] : []),
      ],
      action: { href: url, label: "Otwórz bezpieczny formularz" },
    });
  }
  return { id, url };
}

export async function listAccessRequests(ctx: WorkspaceContext, filter: { clientId?: string; status?: "submitted" } = {}) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const visible = await visibleClientIds(tx, ctx);
    if (visible !== "all" && !visible.length) return [];
    const rows = await tx
      .select({
        id: schema.accessRequests.id,
        clientId: schema.accessRequests.clientId,
        clientName: schema.clients.name,
        requestedTypes: schema.accessRequests.requestedTypes,
        message: schema.accessRequests.message,
        recipientEmail: schema.accessRequests.recipientEmail,
        status: schema.accessRequests.status,
        expiresAt: schema.accessRequests.expiresAt,
        submittedAt: schema.accessRequests.submittedAt,
        reviewedAt: schema.accessRequests.reviewedAt,
        createdAt: schema.accessRequests.createdAt,
        createdByName: schema.user.name,
      })
      .from(schema.accessRequests)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.accessRequests.clientId))
      .leftJoin(schema.user, eq(schema.user.id, schema.accessRequests.createdBy))
      .where(
        and(
          eq(schema.accessRequests.workspaceId, ctx.workspaceId),
          visible === "all" ? undefined : inArray(schema.accessRequests.clientId, visible),
          filter.clientId ? eq(schema.accessRequests.clientId, filter.clientId) : undefined,
          filter.status ? eq(schema.accessRequests.status, filter.status) : undefined,
        ),
      )
      .orderBy(desc(schema.accessRequests.createdAt))
      .limit(200);
    const now = Date.now();
    return rows.map((r) => ({
      ...r,
      expired: r.status === "pending" && r.expiresAt.getTime() < now,
      expiresAt: r.expiresAt.toISOString(),
      submittedAt: r.submittedAt?.toISOString() ?? null,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });
}

export async function revokeAccessRequest(ctx: WorkspaceContext, id: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const [r] = await tx.select().from(schema.accessRequests).where(and(eq(schema.accessRequests.id, id), eq(schema.accessRequests.workspaceId, ctx.workspaceId)));
    if (!r) throw new NotFoundError();
    const access = await getClientAccess(tx, ctx, r.clientId);
    if (!canRequestAccess(ctx.member, access.assignment)) throw new ForbiddenError();
    await tx.update(schema.accessRequests).set({ status: "revoked", submittedCiphertext: null }).where(eq(schema.accessRequests.id, id));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: "request.revoke", targetType: "access_request", targetId: id, clientId: r.clientId }, tx);
  });
}

/** Zgłoszenie do przejrzenia — szyfrogram dla przeglądarki osoby z kluczem skrzynki. */
export async function getSubmission(ctx: WorkspaceContext, id: string) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const [r] = await tx.select().from(schema.accessRequests).where(and(eq(schema.accessRequests.id, id), eq(schema.accessRequests.workspaceId, ctx.workspaceId)));
    if (!r) throw new NotFoundError();
    const access = await getClientAccess(tx, ctx, r.clientId);
    if (!canRequestAccess(ctx.member, access.assignment)) throw new NotFoundError();
    if (r.status !== "submitted" || !r.submittedCiphertext) throw new ConflictError("Zgłoszenie nie czeka na przejrzenie");
    return { id: r.id, clientId: r.clientId, clientName: access.client.name, ciphertext: r.submittedCiphertext, intakeKeyVersion: r.intakeKeyVersion ?? 1, vaultKeyVersion: access.client.vaultKeyVersion };
  });
}

/** Po zapisaniu dostępów w sejfie (w przeglądarce) zgłoszenie jest zamykane, a szyfrogram usuwany. */
export async function reviewAccessRequest(ctx: WorkspaceContext, id: string, decision: "accepted" | "rejected", accepted: number) {
  return withTenant(ctx.workspaceId, async (tx) => {
    const [r] = await tx.select().from(schema.accessRequests).where(and(eq(schema.accessRequests.id, id), eq(schema.accessRequests.workspaceId, ctx.workspaceId)));
    if (!r) throw new NotFoundError();
    const access = await getClientAccess(tx, ctx, r.clientId);
    if (!canRequestAccess(ctx.member, access.assignment)) throw new ForbiddenError();
    if (r.status !== "submitted") throw new ConflictError("Zgłoszenie zostało już przejrzane");
    await tx.update(schema.accessRequests).set({ status: decision, submittedCiphertext: null, reviewedBy: ctx.userId, reviewedAt: new Date() }).where(eq(schema.accessRequests.id, id));
    await recordAudit({ workspaceId: ctx.workspaceId, actorId: ctx.userId, actorName: ctx.userName, action: decision === "accepted" ? "request.accept" : "request.reject", targetType: "access_request", targetId: id, clientId: r.clientId, metadata: { accepted } }, tx);
  });
}

// --- Strona publiczna /request/[token] -------------------------------------------------------

async function findByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const hash = await sha256Hex(token);
  const [r] = await asSystem((tx) =>
    tx
      .select({
        id: schema.accessRequests.id,
        workspaceId: schema.accessRequests.workspaceId,
        clientId: schema.accessRequests.clientId,
        status: schema.accessRequests.status,
        expiresAt: schema.accessRequests.expiresAt,
        requestedTypes: schema.accessRequests.requestedTypes,
        message: schema.accessRequests.message,
        createdBy: schema.accessRequests.createdBy,
        clientName: schema.clients.name,
        workspaceName: schema.workspaces.name,
        intakePublicKey: schema.workspaces.intakePublicKey,
        intakeKeyVersion: schema.workspaces.intakeKeyVersion,
      })
      .from(schema.accessRequests)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.accessRequests.clientId))
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.accessRequests.workspaceId))
      .where(eq(schema.accessRequests.tokenHash, hash)),
  );
  return r ?? null;
}

export async function publicRequest(token: string) {
  const r = await findByToken(token);
  if (!r) throw new NotFoundError("Formularz nie istnieje");
  const usable = r.status === "pending" && r.expiresAt.getTime() > Date.now();
  return {
    id: r.id,
    status: usable ? ("open" as const) : r.status === "submitted" || r.status === "accepted" ? ("submitted" as const) : ("closed" as const),
    clientName: r.clientName,
    workspaceName: r.workspaceName,
    requestedTypes: r.requestedTypes as (keyof typeof TYPE_DEFS)[],
    message: r.message,
    expiresAt: r.expiresAt.toISOString(),
    intakePublicKey: r.intakePublicKey,
    intakeKeyVersion: r.intakeKeyVersion,
  };
}

export async function submitPublicRequest(token: string, input: z.infer<typeof intakeSubmitSchema>, meta: RequestMeta) {
  const limit = await hit(`intake:${meta.ip ?? "?"}`, 20, 3600);
  if (!limit.allowed) throw new ForbiddenError("Zbyt wiele prób. Spróbuj ponownie później.");
  const r = await findByToken(token);
  if (!r) throw new NotFoundError("Formularz nie istnieje");
  if (r.status !== "pending" || r.expiresAt.getTime() < Date.now()) throw new GoneError("Formularz wygasł lub został już wypełniony");
  if (input.intakeKeyVersion !== r.intakeKeyVersion) throw new ConflictError("Klucz agencji się zmienił — odśwież stronę", "STALE_INTAKE_KEY");
  await asSystem(async (tx) => {
    const res = await tx
      .update(schema.accessRequests)
      .set({ status: "submitted", submittedCiphertext: input.ciphertext, intakeKeyVersion: input.intakeKeyVersion, submittedAt: new Date() })
      .where(and(eq(schema.accessRequests.id, r.id), eq(schema.accessRequests.status, "pending")))
      .returning({ id: schema.accessRequests.id });
    if (!res.length) throw new GoneError("Formularz został już wypełniony");
    await recordAudit({ workspaceId: r.workspaceId, actorId: null, actorName: `Klient: ${r.clientName}`, action: "request.submit", targetType: "access_request", targetId: r.id, clientId: r.clientId, metadata: { items: input.itemCount }, meta }, tx);
  });
  const n = {
    type: "request",
    title: `${r.clientName} przekazał(a) dostępy (${input.itemCount}) — do przejrzenia`,
    body: "Przejrzyj zgłoszenie i zaakceptuj, aby dostępy trafiły do sejfu klienta.",
    link: "/dashboard/inbox",
    email: true,
  };
  if (r.createdBy) await notifyUsers([r.createdBy], { ...n, workspaceId: r.workspaceId });
  await notifyManagers(r.workspaceId, { ...n, dedupeMinutes: 1 });
}
