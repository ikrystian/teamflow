import { CrmDashboardSection } from "@/components/clients/crm-dashboard-section"
import { DashboardContent } from "@/components/dashboard/content"
import { WhatsNewDialog } from "@/components/dashboard/whats-new-dialog"
import { getUnseenChangelog } from "@/lib/changelog"
import { getAuthState, optionalWorkspace } from "@/lib/dal/session"
import { logger } from "@/lib/logger"
import { isManagerRole } from "@/lib/roles"

export default async function Dashboard() {
  // Sesję sprawdza layout panelu; sekcja klientów tylko dla osób z dostępem do CRM i sejfu.
  const state = await getAuthState()
  const [ctx, whatsNew] = await Promise.all([
    state && state.hasVault && !isManagerRole(state.user.role) ? optionalWorkspace(state) : null,
    // Popup „Co nowego” nie może zablokować dashboardu, jeśli baza projektów chwilowo nie odpowiada.
    state
      ? getUnseenChangelog(state.user.id).catch((error) => {
          logger.error("changelog.unseen_failed", { error })
          return []
        })
      : [],
  ])

  return (
    <>
      <DashboardContent crmSection={ctx ? <CrmDashboardSection ctx={ctx} /> : null} />
      <WhatsNewDialog entries={whatsNew} />
    </>
  )
}
