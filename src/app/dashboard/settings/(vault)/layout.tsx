import { Suspense } from "react";
import { VaultGate } from "@/components/layout/vault-gate";
import { requireWorkspace } from "@/lib/dal/session";

/** Zespół (nadawanie kluczy) oraz import i eksport szyfrują i odszyfrowują dane w przeglądarce — wymagają odblokowanego sejfu. */
export default async function VaultSettingsLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspace();
  return (
    <Suspense>
      <VaultGate>{children}</VaultGate>
    </Suspense>
  );
}
