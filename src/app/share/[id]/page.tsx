import { PublicShell } from "@/components/public/public-shell";
import { ShareViewer } from "@/components/public/share-viewer";

export const metadata = { title: "Bezpieczny link", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Publiczna strona linku jednorazowego. Klucz jest we fragmencie (#) i nie trafia na serwer. */
export default async function SharePage({ params }: PageProps<"/share/[id]">) {
  const { id } = await params;
  return (
    <PublicShell>
      <ShareViewer id={id} />
    </PublicShell>
  );
}
