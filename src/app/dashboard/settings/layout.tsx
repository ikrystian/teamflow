import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNav, type SettingsNavGroup } from "@/components/settings/settings-nav";
import { isAdmin } from "@/lib/admin";
import { getAuthState, optionalWorkspace } from "@/lib/dal/session";
import { isManagerRole } from "@/lib/roles";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const state = await getAuthState();
  if (!state) redirect("/auth/signin?next=/dashboard/settings");
  const crmAllowed = !isManagerRole(state.user.role);
  const crmReady = crmAllowed && state.hasVault && Boolean(await optionalWorkspace(state));
  const admin = await isAdmin();

  const groups: SettingsNavGroup[] = [
    {
      label: "Konto",
      items: [
        { href: "/dashboard/settings/profile", label: "Profil", icon: "user" },
        { href: "/dashboard/settings/security", label: "Logowanie i sesje", icon: "shield" },
        ...(crmAllowed ? [{ href: "/dashboard/settings/vault", label: "Sejf", icon: "vault" as const }] : []),
        { href: "/dashboard/settings/notifications", label: "Powiadomienia", icon: "bell" },
        { href: "/dashboard/settings/privacy", label: "Prywatność", icon: "key" },
        { href: "/dashboard/settings/appearance", label: "Wygląd", icon: "palette" },
      ],
    },
    {
      label: "Projekty",
      items: [
        { href: "/dashboard/settings/task-statuses", label: "Statusy zadań", icon: "list" },
        { href: "/dashboard/settings/tags", label: "Tagi", icon: "tag" },
      ],
    },
    ...(crmReady
      ? [
          {
            label: "Klienci i sejf",
            items: [
              { href: "/dashboard/settings/team", label: "Zespół i dostęp do klientów", icon: "team" as const },
              { href: "/dashboard/settings/workspace", label: "Przestrzeń klientów", icon: "building" as const },
              { href: "/dashboard/settings/data", label: "Import i eksport", icon: "database" as const },
            ],
          },
        ]
      : []),
    ...(admin
      ? [
          {
            label: "Administracja",
            items: [
              { href: "/dashboard/settings/smtp", label: "SMTP", icon: "mail" as const },
              { href: "/dashboard/settings/users", label: "Użytkownicy", icon: "users" as const },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <PageHeader title="Ustawienia" description="Konto, projekty, klienci i sejf w jednym miejscu" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <SettingsNav groups={groups} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
