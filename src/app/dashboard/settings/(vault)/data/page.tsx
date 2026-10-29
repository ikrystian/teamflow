import { DataSettings } from "@/components/settings/data";
import { requireWorkspace } from "@/lib/dal/session";
import { canExport, canEditClients } from "@/lib/permissions";

export const metadata = { title: "Import i eksport" };

export default async function DataPage() {
  const ctx = await requireWorkspace();
  return <DataSettings canExport={canExport(ctx.member)} isOwner={ctx.member.role === "owner"} canCreateClients={canEditClients(ctx.member)} />;
}
