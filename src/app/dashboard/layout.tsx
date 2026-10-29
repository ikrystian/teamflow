import { redirect } from "next/navigation"
import { DashboardLayout, type CrmShellInfo } from "@/components/dashboard/layout"
import { TimeTrackerWidget } from "@/components/time-tracker-widget"
import { listReminders } from "@/lib/dal/activity"
import { listAccessRequests } from "@/lib/dal/requests"
import { currentPath, getAuthState, optionalWorkspace } from "@/lib/dal/session"
import { auditScope } from "@/lib/permissions"
import { isManagerRole } from "@/lib/roles"

/**
 * Wspólna powłoka panelu Nexusa: moduł projektów i moduł klientów/sejfu.
 * Wymaga sesji (i drugiego składnika, jeśli konto ma włączone TOTP). Strony projektów
 * nie wymagają sejfu — bramkę sejfu ma tylko grupa (crm).
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const state = await getAuthState()
  if (!state) redirect(`/auth/signin?next=${encodeURIComponent(await currentPath())}`)
  if (state.needsMfa) redirect(`/auth/signin/two-factor?next=${encodeURIComponent(await currentPath())}`)

  // "manager" to rola osób z zewnątrz — bez modułu klientów i sejfu.
  let crm: CrmShellInfo | null = null
  if (!isManagerRole(state.user.role)) {
    const ctx = await optionalWorkspace(state)
    const ready = Boolean(ctx && state.hasVault)
    const [inbox, tasks] = ready && ctx
      ? await Promise.all([listAccessRequests(ctx, { status: "submitted" }), listReminders(ctx, { mine: true })])
      : [[], []]
    crm = {
      workspace: ctx ? { id: ctx.workspaceId, name: ctx.workspaceName, role: ctx.member.role } : null,
      preferences: state.user.preferences,
      counts: { inbox: inbox.length, tasks: tasks.length },
      canSeeActivity: ctx ? auditScope(ctx.member) !== "none" : false,
    }
  }

  return (
    <>
      <DashboardLayout crm={crm}>{children}</DashboardLayout>
      <TimeTrackerWidget />
    </>
  )
}
