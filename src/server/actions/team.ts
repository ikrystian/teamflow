"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { workspaceContext } from "@/lib/dal/session";
import {
  approveKeys,
  changeRole,
  invite,
  leaveWorkspace,
  offboardingReport,
  removeMember,
  revokeInvitation,
  setExportPermission,
  setMemberSuspended,
  shareCredentialInTeam,
  transferOwnership,
  unshareCredentialInTeam,
} from "@/lib/dal/team";
import { ciphertext, inviteSchema, roleSchema, uuid } from "@/lib/validation";
import { run } from "./_run";

const userId = z.string().min(1).max(100);

export async function inviteAction(input: unknown) {
  return run("team.invite", async () => {
    await invite(await workspaceContext(), inviteSchema.parse(input));
    revalidatePath("/dashboard/settings/team");
    return null;
  });
}

export async function revokeInvitationAction(id: string) {
  return run("team.revokeInvite", async () => {
    await revokeInvitation(await workspaceContext(), uuid.parse(id));
    revalidatePath("/dashboard/settings/team");
    return null;
  });
}

export async function changeRoleAction(uid: string, role: string) {
  return run("team.role", async () => {
    await changeRole(await workspaceContext(), userId.parse(uid), roleSchema.parse(role));
    revalidatePath("/dashboard/settings/team");
    return null;
  });
}

export async function setExportPermissionAction(uid: string, value: boolean) {
  return run("team.export", async () => {
    await setExportPermission(await workspaceContext(), userId.parse(uid), z.boolean().parse(value));
    revalidatePath("/dashboard/settings/team");
    return null;
  });
}

export async function setSuspendedAction(uid: string, value: boolean) {
  return run("team.suspend", async () => {
    await setMemberSuspended(await workspaceContext(), userId.parse(uid), z.boolean().parse(value));
    revalidatePath("/dashboard/settings/team");
    return null;
  });
}

export async function transferOwnershipAction(uid: string) {
  return run("team.transfer", async () => {
    await transferOwnership(await workspaceContext(), userId.parse(uid));
    revalidatePath("/dashboard/settings", "layout");
    return null;
  });
}

export async function approveKeysAction(uid: string) {
  return run("team.approveKeys", async () => {
    await approveKeys(await workspaceContext(), userId.parse(uid));
    revalidatePath("/dashboard/settings/team");
    return null;
  });
}

export async function offboardingReportAction(uid: string) {
  return run("team.offboardingReport", async () => offboardingReport(await workspaceContext(), userId.parse(uid)));
}

export async function removeMemberAction(uid: string, tasks: unknown) {
  return run("team.remove", async () => {
    const parsed = z.array(z.object({ credentialId: uuid, assigneeUserId: userId })).max(5000).parse(tasks);
    const r = await removeMember(await workspaceContext(), userId.parse(uid), parsed);
    revalidatePath("/dashboard/settings/team");
    return r;
  });
}

export async function leaveWorkspaceAction() {
  return run("team.leave", async () => {
    await leaveWorkspace(await workspaceContext());
    return null;
  });
}

export async function shareInTeamAction(credentialId: string, uid: string, encryptedKey: string, userKeysVersion: number) {
  return run("team.shareCredential", async () =>
    shareCredentialInTeam(await workspaceContext(), uuid.parse(credentialId), userId.parse(uid), ciphertext(1000).parse(encryptedKey), z.number().int().min(1).parse(userKeysVersion)),
  );
}

export async function unshareInTeamAction(credentialId: string, uid: string) {
  return run("team.unshareCredential", async () => unshareCredentialInTeam(await workspaceContext(), uuid.parse(credentialId), userId.parse(uid)));
}
