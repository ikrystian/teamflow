import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AccountSecurity } from "@/components/settings/account-security";
import { db, schema } from "@/lib/db";
import { getAuthState } from "@/lib/dal/session";

export const metadata = { title: "Logowanie i sesje" };

export default async function SecuritySettingsPage() {
  const state = await getAuthState();
  if (!state) redirect("/auth/signin?next=/dashboard/settings/security");
  const accounts = await db.select({ providerId: schema.account.providerId }).from(schema.account).where(eq(schema.account.userId, state.user.id));
  return <AccountSecurity hasPassword={accounts.some((a) => a.providerId === "credential")} hasTotp={state.hasTotp} currentSessionId={state.session.id} providers={accounts.map((a) => a.providerId)} />;
}
