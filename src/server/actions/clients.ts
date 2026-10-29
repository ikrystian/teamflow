"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createClient,
  deleteClient,
  deleteContact,
  deleteDomain,
  getDomain,
  saveContact,
  saveDomain,
  setClientLogo,
  setClientTeam,
  toggleFavorite,
  updateClient,
  updateClientNotes,
  updateDomainSsl,
} from "@/lib/dal/clients";
import { workspaceContext } from "@/lib/dal/session";
import { checkSsl } from "@/lib/integrations/ssl";
import { ciphertext, clientNotesSchema, clientSchema, contactSchema, domainSchema, logoSchema, uuid } from "@/lib/validation";
import { run } from "./_run";

export async function createClientAction(input: unknown) {
  return run("clients.create", async () => {
    const extra = z.object({ id: uuid, vaultGrant: ciphertext(1000) }).parse(input);
    const data = clientSchema.parse(input);
    const res = await createClient(await workspaceContext(), { ...data, ...extra });
    revalidatePath("/dashboard/clients");
    return res;
  });
}

export async function updateClientAction(clientId: string, input: unknown) {
  return run("clients.update", async () => {
    await updateClient(await workspaceContext(), uuid.parse(clientId), clientSchema.parse(input));
    revalidatePath(`/dashboard/clients/${clientId}`, "layout");
    return null;
  });
}

export async function setClientLogoAction(clientId: string, logo: string | null) {
  return run("clients.logo", async () => {
    await setClientLogo(await workspaceContext(), uuid.parse(clientId), logo === null ? null : logoSchema.parse(logo));
    revalidatePath(`/dashboard/clients/${clientId}`, "layout");
    return null;
  });
}

export async function updateClientNotesAction(clientId: string, notes: string) {
  return run("clients.notes", async () => {
    await updateClientNotes(await workspaceContext(), uuid.parse(clientId), clientNotesSchema.parse({ notes }).notes);
    return null;
  });
}

export async function deleteClientAction(clientId: string) {
  return run("clients.delete", async () => {
    await deleteClient(await workspaceContext(), uuid.parse(clientId));
    revalidatePath("/dashboard/clients");
    return null;
  });
}

export async function toggleFavoriteAction(clientId: string) {
  return run("clients.favorite", async () => {
    const r = await toggleFavorite(await workspaceContext(), uuid.parse(clientId));
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard");
    return r;
  });
}

export async function setClientTeamAction(clientId: string, members: unknown) {
  return run("clients.team", async () => {
    const list = z.array(z.object({ userId: z.string().min(1).max(100), canViewCritical: z.boolean() })).max(500).parse(members);
    const r = await setClientTeam(await workspaceContext(), uuid.parse(clientId), list);
    revalidatePath(`/dashboard/clients/${clientId}`, "layout");
    return r;
  });
}

export async function saveContactAction(clientId: string, contactId: string | null, input: unknown) {
  return run("contacts.save", async () => {
    const r = await saveContact(await workspaceContext(), uuid.parse(clientId), contactId ? uuid.parse(contactId) : null, contactSchema.parse(input));
    revalidatePath(`/dashboard/clients/${clientId}/contacts`);
    return r;
  });
}

export async function deleteContactAction(clientId: string, contactId: string) {
  return run("contacts.delete", async () => {
    await deleteContact(await workspaceContext(), uuid.parse(clientId), uuid.parse(contactId));
    revalidatePath(`/dashboard/clients/${clientId}/contacts`);
    return null;
  });
}

export async function saveDomainAction(clientId: string, domainId: string | null, input: unknown) {
  return run("domains.save", async () => {
    const r = await saveDomain(await workspaceContext(), uuid.parse(clientId), domainId ? uuid.parse(domainId) : null, domainSchema.parse(input));
    revalidatePath(`/dashboard/clients/${clientId}/domains`);
    return r;
  });
}

export async function deleteDomainAction(clientId: string, domainId: string) {
  return run("domains.delete", async () => {
    await deleteDomain(await workspaceContext(), uuid.parse(clientId), uuid.parse(domainId));
    revalidatePath(`/dashboard/clients/${clientId}/domains`);
    return null;
  });
}

export async function checkDomainSslAction(clientId: string, domainId: string) {
  return run("domains.ssl", async () => {
    const ctx = await workspaceContext();
    const d = await getDomain(ctx, uuid.parse(clientId), uuid.parse(domainId));
    const r = await checkSsl(d.name);
    await updateDomainSsl(ctx, clientId, domainId, r);
    revalidatePath(`/dashboard/clients/${clientId}/domains`);
    return { expiresAt: r.expiresAt?.toISOString() ?? null, issuer: r.issuer, error: r.error };
  });
}
