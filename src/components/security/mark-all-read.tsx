"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "@/server/actions/workspace";

export function MarkAllRead() {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={async () => (await markNotificationsReadAction("all"), router.refresh())}>
      Oznacz wszystkie jako przeczytane
    </Button>
  );
}
