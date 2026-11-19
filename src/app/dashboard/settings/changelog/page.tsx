import { notFound } from "next/navigation"
import { ChangelogManagement } from "@/components/settings/changelog-management"
import { isAdmin } from "@/lib/admin"

export const metadata = { title: "Changelog" }

export default async function Page() {
  if (!(await isAdmin())) notFound()
  return <ChangelogManagement />
}
