import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Nie znaleziono strony</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Strona nie istnieje albo nie masz do niej dostępu.</p>
      <Button asChild>
        <Link href="/dashboard">Wróć do pulpitu</Link>
      </Button>
    </main>
  );
}
