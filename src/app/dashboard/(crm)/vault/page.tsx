import { PageHeader } from "@/components/layout/page-header";
import { SharesPanel } from "@/components/vault/shares-panel";
import { CredentialsView } from "@/components/vault/credentials-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser, requireWorkspace } from "@/lib/dal/session";
import { workspaceSettings } from "@/lib/dal/account";
import { canShareExternally } from "@/lib/permissions";

export const metadata = { title: "Wszystkie dostępy" };

export default async function VaultPage({ searchParams }: PageProps<"/dashboard/vault">) {
  const ctx = await requireWorkspace();
  const state = await requireUser();
  const s = workspaceSettings(ctx.settings);
  const tab = (await searchParams).tab === "shares" ? "shares" : "all";
  return (
    <>
      <PageHeader title="Wszystkie dostępy" description="Dostępy ze wszystkich klientów, do których masz uprawnienia. Wyszukiwanie działa lokalnie w przeglądarce." />
      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="all">Dostępy</TabsTrigger>
          <TabsTrigger value="shares">Linki jednorazowe</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="pt-4">
          <CredentialsView canShareExternal={canShareExternally(ctx.member, ctx.settings)} maxShareHours={s.maxShareHours} passwordMaxAgeDays={s.passwordMaxAgeDays} initialView={state.user.preferences.vaultView ?? "table"} />
        </TabsContent>
        <TabsContent value="shares" className="pt-4">
          <SharesPanel />
        </TabsContent>
      </Tabs>
    </>
  );
}
