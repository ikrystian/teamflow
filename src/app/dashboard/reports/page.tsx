import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/layout"
import { ReportsContent } from "@/components/reports/reports-content"

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <ReportsContent />
    </DashboardLayout>
  )
}
