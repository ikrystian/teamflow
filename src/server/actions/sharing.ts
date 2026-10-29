"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAccessRequest, revokeAccessRequest, reviewAccessRequest } from "@/lib/dal/requests";
import { workspaceContext } from "@/lib/dal/session";
import { createShare, revokeShare } from "@/lib/dal/shares";
import { accessRequestCreateSchema, shareCreateSchema, uuid } from "@/lib/validation";
import { run } from "./_run";

export async function createShareAction(input: unknown) {
  return run("share.create", async () => createShare(await workspaceContext(), shareCreateSchema.parse(input)));
}

export async function revokeShareAction(id: string) {
  return run("share.revoke", async () => {
    await revokeShare(await workspaceContext(), uuid.parse(id));
    revalidatePath("/dashboard/vault");
    return null;
  });
}

export async function createAccessRequestAction(input: unknown) {
  return run("request.create", async () => {
    const r = await createAccessRequest(await workspaceContext(), accessRequestCreateSchema.parse(input));
    revalidatePath("/dashboard/inbox");
    return r;
  });
}

export async function revokeAccessRequestAction(id: string) {
  return run("request.revoke", async () => {
    await revokeAccessRequest(await workspaceContext(), uuid.parse(id));
    revalidatePath("/dashboard/inbox");
    return null;
  });
}

export async function reviewAccessRequestAction(id: string, decision: "accepted" | "rejected", accepted: number) {
  return run("request.review", async () => {
    await reviewAccessRequest(await workspaceContext(), uuid.parse(id), z.enum(["accepted", "rejected"]).parse(decision), z.number().int().min(0).parse(accepted));
    revalidatePath("/dashboard/inbox");
    return null;
  });
}
