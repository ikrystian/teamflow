import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/layout"
import { SettingsContent } from "@/components/settings/settings-content"

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <SettingsContent />
      </Suspense>
    </DashboardLayout>
  )
}
