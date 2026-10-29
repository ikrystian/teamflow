"use client";

import { Check, Download, FingerprintPattern, Loader2, Printer, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth/client";
import { FormError } from "./auth-card";

/** Opcjonalne 2FA: aplikacja TOTP z kodami zapasowymi albo passkey. */
export function TwoFactorSetup({ next, needsPassword }: { next: string; needsPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<{ qr: string; secret: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const goNext = () => {
    router.push(next);
    router.refresh();
  };

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await authClient.twoFactor.enable(needsPassword ? { password, method: "totp" } : { method: "totp" });
    setBusy(false);
    if (r.error || !r.data || r.data.method !== "totp") return setError(r.error?.message ?? "Nie udało się rozpocząć konfiguracji");
    const uri = r.data.totpURI;
    const secret = new URL(uri).searchParams.get("secret") ?? "";
    setSetup({ qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), secret, backupCodes: r.data.backupCodes });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    setBusy(false);
    if (r.error) return setError("Nieprawidłowy kod — sprawdź czas w telefonie i spróbuj ponownie");
    setVerified(true);
  }

  async function addPasskey() {
    setBusy(true);
    setError(null);
    const r = await authClient.passkey.addPasskey({ name: "Passkey (rejestracja)" });
    if (r?.error) {
      setBusy(false);
      return setError(r.error.message ?? "Nie udało się dodać passkeya");
    }
    setBusy(false);
    goNext();
  }

  function downloadCodes() {
    const blob = new Blob([`Nexus — kody zapasowe 2FA\nKażdy kod działa jeden raz.\n\n${setup!.backupCodes.join("\n")}\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nexus-kody-zapasowe-2fa.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (verified && setup) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="size-4" aria-hidden /> Aplikacja uwierzytelniająca jest skonfigurowana.
        </p>
        <div className="print-area rounded-md border p-4">
          <p className="mb-2 text-sm font-medium">Kody zapasowe — każdy działa jeden raz</p>
          <ul className="secret grid grid-cols-2 gap-1 text-sm">
            {setup.backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">Zapisz kody w bezpiecznym miejscu. Pozwolą zalogować się bez telefonu.</p>
        <div className="flex flex-wrap gap-2 no-print">
          <Button variant="outline" onClick={downloadCodes}>
            <Download aria-hidden /> Pobierz
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden /> Drukuj
          </Button>
          <Button className="ml-auto" onClick={goNext}>Dalej</Button>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="totp">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="totp">
          <QrCode aria-hidden /> Aplikacja TOTP
        </TabsTrigger>
        <TabsTrigger value="passkey">
          <FingerprintPattern aria-hidden /> Passkey
        </TabsTrigger>
      </TabsList>
      <TabsContent value="totp" className="space-y-4 pt-2">
        {!setup ? (
          <form onSubmit={start} className="space-y-4">
            <p className="text-sm text-muted-foreground">Użyj aplikacji, np. Google Authenticator, Microsoft Authenticator, 1Password lub Aegis.</p>
            {needsPassword ? (
              <div className="space-y-1.5">
                <Label htmlFor="pw">Potwierdź hasło konta</Label>
                <Input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            ) : null}
            <FormError message={error} />
            <Button type="submit" className="w-full" disabled={busy || (needsPassword && !password)}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Wygeneruj kod QR
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- kod QR jako data URL */}
              <img src={setup.qr} alt="Kod QR do zeskanowania w aplikacji uwierzytelniającej" width={220} height={220} className="rounded-md bg-white p-2" />
              <details className="w-full text-sm">
                <summary className="cursor-pointer text-muted-foreground">Nie możesz zeskanować? Wpisz klucz ręcznie</summary>
                <code className="secret mt-2 block break-all rounded bg-muted p-2">{setup.secret}</code>
              </details>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totp">Kod z aplikacji</Label>
              <Input id="totp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="secret text-center text-lg tracking-[0.3em]" required autoFocus />
            </div>
            <FormError message={error} />
            <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Potwierdź
            </Button>
          </form>
        )}
      </TabsContent>
      <TabsContent value="passkey" className="space-y-4 pt-2">
        <p className="text-sm text-muted-foreground">
          Passkey (klucz sprzętowy, Touch ID, Windows Hello, menedżer haseł) pozwala logować się bez hasła konta. Nie zastępuje kodów z aplikacji TOTP — to osobna, opcjonalna metoda logowania.
        </p>
        <FormError message={error} />
        <Button className="w-full" onClick={addPasskey} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <FingerprintPattern aria-hidden />} Dodaj passkey
        </Button>
      </TabsContent>
    </Tabs>
  );
}
