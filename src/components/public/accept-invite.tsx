"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lockVault } from "@/lib/vault/store";
import { acceptInvitationAction } from "@/server/actions/account";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Po dołączeniu administrator przypisze Cię do klientów. Kopie kluczy sejfów nadadzą się automatycznie, gdy ktoś z dostępem odblokuje sejf.</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await acceptInvitationAction(token);
          if (!r.ok) {
            setBusy(false);
            return setError(r.error);
          }
          lockVault("workspace_switch");
          router.push("/auth/unlock?next=/dashboard/clients");
          router.refresh();
        }}
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Przyjmij zaproszenie
      </Button>
    </div>
  );
}
