import { EmailVerificationNotice } from "@/components/settings/email-verification-notice"
import { SettingsContent } from "@/components/settings/settings-content"
import { getAuthState } from "@/lib/dal/session"

export const metadata = { title: "Profil" }

export default async function ProfilePage() {
  const state = await getAuthState()
  return (
    <div className="space-y-6">
      {state && !state.user.emailVerified ? <EmailVerificationNotice email={state.user.email} /> : null}
      <SettingsContent section="profile" />
    </div>
  )
}
