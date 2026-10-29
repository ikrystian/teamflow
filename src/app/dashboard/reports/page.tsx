import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ReportsContent } from "@/components/reports/reports-content"

export default async function ReportsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <ReportsContent />
  )
}
