import { CrmDashboardSection } from "@/components/clients/crm-dashboard-section"
import { DashboardContent } from "@/components/dashboard/content"
import { getAuthState, optionalWorkspace } from "@/lib/dal/session"
import { isManagerRole } from "@/lib/roles"

export default async function Dashboard() {
  // Sesję sprawdza layout panelu; sekcja klientów tylko dla osób z dostępem do CRM i sejfu.
  const state = await getAuthState()
  const ctx = state && state.hasVault && !isManagerRole(state.user.role) ? await optionalWorkspace(state) : null

  return (
    <DashboardContent crmSection={ctx ? <CrmDashboardSection ctx={ctx} /> : null} />
  )
}
