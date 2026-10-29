import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/password-reset";

export const metadata = { title: "Reset hasła konta" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset hasła konta" description="Wyślemy link do ustawienia nowego hasła konta. Hasło główne sejfu pozostaje bez zmian.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
