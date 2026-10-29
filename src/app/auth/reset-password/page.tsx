import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/password-reset";

export const metadata = { title: "Nowe hasło konta" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/auth/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <AuthCard title="Ustaw nowe hasło konta" description="Po zmianie wszystkie sesje zostaną wylogowane.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
