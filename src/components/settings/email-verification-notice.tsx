"use client";

import { MailWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

/** Adres e-mail konta nie został potwierdzony — powiadomienia e-mail mogą nie docierać. */
export function EmailVerificationNotice({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/40">
      <p className="flex items-center gap-2">
        <MailWarning className="size-4 shrink-0" aria-hidden /> Adres {email} nie jest potwierdzony.
      </p>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard/settings/profile" });
          setBusy(false);
          if (r.error) toast.error(r.error.message ?? "Nie udało się wysłać wiadomości");
          else toast.success("Wysłano e-mail weryfikacyjny");
        }}
      >
        Wyślij e-mail weryfikacyjny
      </Button>
    </div>
  );
}
