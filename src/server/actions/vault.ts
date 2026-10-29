"use server";

import { z } from "zod";
import { workspaceContext } from "@/lib/dal/session";
import {
  deleteCredential,
  importCredentials,
  markNeedsRotation,
  moveCredentials,
  rotateClientKey,
  rotateIntakeKey,
  saveCredential,
  submitGrants,
} from "@/lib/dal/vault";
import { ciphertext, b64key, credentialMoveSchema, credentialWriteSchema, keyGrantSchema, uuid } from "@/lib/validation";
import { run } from "./_run";

export async function saveCredentialAction(input: unknown) {
  return run("vault.save", async () => saveCredential(await workspaceContext(), credentialWriteSchema.parse(input)));
}

/** Operacja zbiorcza „dodaj tag” = wiele zapisów z ponownie zaszyfrowaną częścią przeglądową. */
export async function saveCredentialsAction(inputs: unknown) {
  return run("vault.saveMany", async () => {
    const ctx = await workspaceContext();
    const list = z.array(credentialWriteSchema).max(500).parse(inputs);
    for (const i of list) await saveCredential(ctx, i);
    return { saved: list.length };
  });
}

export async function deleteCredentialAction(id: string) {
  return run("vault.delete", async () => deleteCredential(await workspaceContext(), uuid.parse(id)));
}

export async function markRotationAction(ids: string[], value: boolean) {
  return run("vault.markRotation", async () => markNeedsRotation(await workspaceContext(), z.array(uuid).max(500).parse(ids), z.boolean().parse(value)));
}

export async function moveCredentialsAction(moves: unknown) {
  return run("vault.move", async () => moveCredentials(await workspaceContext(), z.array(credentialMoveSchema).max(500).parse(moves)));
}

export async function importCredentialsAction(items: unknown, source: string) {
  return run("vault.import", async () =>
    importCredentials(await workspaceContext(), z.array(credentialWriteSchema).max(5000).parse(items), z.enum(["bitwarden", "1password", "keepass", "chrome", "firefox", "generic"]).parse(source)),
  );
}

export async function submitGrantsAction(grants: unknown) {
  return run("vault.grants", async () => submitGrants(await workspaceContext(), z.array(keyGrantSchema).max(2000).parse(grants)));
}

export async function rotateClientKeyAction(input: unknown) {
  return run("vault.rotate", async () => {
    const parsed = z
      .object({
        clientId: uuid,
        fromVersion: z.number().int().min(1),
        items: z.array(z.object({ id: uuid, encryptedItemKey: ciphertext(1000) })).max(20000),
        grants: z.array(keyGrantSchema).max(2000),
      })
      .parse(input);
    return rotateClientKey(await workspaceContext(), parsed);
  });
}

export async function rotateIntakeKeyAction(input: unknown) {
  return run("vault.rotateIntake", async () => {
    const parsed = z
      .object({
        fromVersion: z.number().int().min(1),
        publicKey: b64key,
        submissions: z.array(z.object({ id: uuid, submittedCiphertext: ciphertext(2_000_000) })).max(1000),
        grants: z.array(keyGrantSchema).max(2000),
      })
      .parse(input);
    return rotateIntakeKey(await workspaceContext(), parsed);
  });
}
