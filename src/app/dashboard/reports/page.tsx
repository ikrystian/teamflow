import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ReportsContent, type ReportsSearchParams } from "@/components/reports/reports-content"

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const params = await searchParams
  const filters: ReportsSearchParams = {
    period: first(params.period),
    from: first(params.from),
    to: first(params.to),
    unit: first(params.unit),
    project: first(params.project),
    person: first(params.person),
  }

  return (
    <ReportsContent searchParams={filters} />
  )
}
