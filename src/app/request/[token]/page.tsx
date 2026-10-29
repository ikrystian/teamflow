import { PublicShell } from "@/components/public/public-shell";
import { RequestForm } from "@/components/public/request-form";

export const metadata = { title: "Przekazanie dostępów", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Formularz przekazania dostępów dla klienta agencji (bez konta). */
export default async function RequestPage({ params }: PageProps<"/request/[token]">) {
  const { token } = await params;
  return (
    <PublicShell>
      <RequestForm token={token} />
    </PublicShell>
  );
}
