"use client";

import { GlassAtmosphere } from "@/components/layout/glass-atmosphere";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <GlassAtmosphere />
      <h1 className="text-2xl font-semibold">Coś poszło nie tak</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Spróbuj ponownie. Jeśli problem się powtarza, skontaktuj się z administratorem.</p>
      <Button onClick={reset}>Spróbuj ponownie</Button>
    </main>
  );
}
