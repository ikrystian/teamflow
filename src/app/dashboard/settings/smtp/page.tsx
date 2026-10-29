import { notFound } from "next/navigation"
import { SettingsContent } from "@/components/settings/settings-content"
import { isAdmin } from "@/lib/admin"

export const metadata = { title: "SMTP" }

export default async function Page() {
  if (!(await isAdmin())) notFound()
  return <SettingsContent section="smtp" />
}
