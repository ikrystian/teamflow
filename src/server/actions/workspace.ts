"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { changePlan, deleteWorkspace, updateWorkspaceSettings } from "@/lib/dal/account";
import { markNotificationsRead, setReminderStatus } from "@/lib/dal/activity";
import { UnauthorizedError } from "@/lib/dal/errors";
import { getSession, WORKSPACE_COOKIE, workspaceContext } from "@/lib/dal/session";
import { uuid, workspaceSettingsSchema } from "@/lib/validation";
import { run } from "./_run";

export async function updateWorkspaceSettingsAction(input: unknown) {
  return run("workspace.settings", async () => {
    await updateWorkspaceSettings(await workspaceContext(), workspaceSettingsSchema.parse(input));
    revalidatePath("/dashboard/settings", "layout");
    return null;
  });
}

export async function changePlanAction(plan: string) {
  return run("workspace.plan", async () => {
    await changePlan(await workspaceContext(), z.string().max(20).parse(plan));
    revalidatePath("/dashboard/settings/workspace");
    return null;
  });
}

export async function deleteWorkspaceAction(confirmName: string) {
  return run("workspace.delete", async () => {
    await deleteWorkspace(await workspaceContext(), z.string().max(200).parse(confirmName));
    (await cookies()).delete(WORKSPACE_COOKIE);
    return null;
  });
}

export async function markNotificationsReadAction(ids: string[] | "all") {
  return run("notifications.read", async () => {
    const s = await getSession();
    if (!s) throw new UnauthorizedError();
    await markNotificationsRead(s.user.id, ids === "all" ? "all" : z.array(uuid).max(200).parse(ids));
    return null;
  });
}

export async function setReminderStatusAction(id: string, status: "done" | "dismissed" | "open") {
  return run("reminders.status", async () => {
    await setReminderStatus(await workspaceContext(), uuid.parse(id), z.enum(["done", "dismissed", "open"]).parse(status));
    revalidatePath("/dashboard/security");
    revalidatePath("/dashboard");
    return null;
  });
}
