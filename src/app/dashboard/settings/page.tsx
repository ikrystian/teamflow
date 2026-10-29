import { redirect } from "next/navigation"

const SECTIONS = new Set(["profile", "security", "vault", "notifications", "privacy", "appearance", "task-statuses", "tags", "team", "workspace", "data", "smtp", "users"])

/** Dawne adresy `/dashboard/settings?tab=…` prowadzą do odpowiednich sekcji. */
export default async function SettingsIndex({ searchParams }: PageProps<"/dashboard/settings">) {
  const tab = (await searchParams).tab
  const section = typeof tab === "string" && SECTIONS.has(tab) ? tab : "profile"
  redirect(`/dashboard/settings/${section}`)
}
