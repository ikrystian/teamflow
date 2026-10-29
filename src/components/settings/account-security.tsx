"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FingerprintPattern, Laptop, Loader2, LogOut, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { formatDateTime, formatRelative } from "@/lib/format";
import { PasswordInput } from "@/components/vault/password-input";
import { StatusBadge } from "@/components/vault/badges";

function device(ua?: string | null) {
  if (!ua) return "Nieznane urządzenie";
  const b = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Przeglądarka";
  const o = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${b}${o ? ` · ${o}` : ""}`;
}

export function AccountSecurity({ hasPassword, hasTotp, currentSessionId, providers }: { hasPassword: boolean; hasTotp: boolean; currentSessionId: string; providers: string[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: async () => (await authClient.listSessions()).data ?? [] });
  const passkeys = useQuery({ queryKey: ["passkeys"], queryFn: async () => (await authClient.passkey.listUserPasskeys()).data ?? [] });
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [codePw, setCodePw] = useState("");

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("pw");
    const r = await authClient.changePassword({ currentPassword: cur, newPassword: next, revokeOtherSessions: true });
    setBusy(null);
    if (r.error) return toast.error(r.error.message ?? "Nie udało się zmienić hasła");
    setCur("");
    setNext("");
    toast.success("Zmieniono hasło konta. Pozostałe sesje zostały wylogowane.");
    await qc.invalidateQueries({ queryKey: ["sessions"] });
  }


  return (
    <>
      {hasPassword ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasło konta</CardTitle>
            <CardDescription>Służy do logowania. Zmiana wylogowuje wszystkie pozostałe sesje. Hasło główne sejfu zmieniasz osobno poniżej.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cp-cur">Obecne hasło</Label>
                <Input id="cp-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-new">Nowe hasło (min. 12 znaków)</Label>
                <PasswordInput id="cp-new" value={next} onChange={setNext} />
              </div>
              <div>
                <Button type="submit" disabled={busy === "pw" || !cur || next.length < 12}>
                  {busy === "pw" ? <Loader2 className="animate-spin" aria-hidden /> : null} Zmień hasło konta
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logowanie</CardTitle>
            <CardDescription>Logujesz się przez: {providers.join(", ")}.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weryfikacja dwuetapowa</CardTitle>
          <CardDescription>Opcjonalna, ale zalecana: aplikacja TOTP (z kodami zapasowymi). Passkeys pozwalają logować się bez hasła.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Aplikacja TOTP:</span> {hasTotp ? <StatusBadge variant="ok">włączona</StatusBadge> : <StatusBadge>wyłączona</StatusBadge>}
            {!hasTotp ? (
              <Button size="sm" variant="outline" onClick={() => router.push("/auth/signup/two-factor?next=/dashboard/settings/security")}>
                Włącz
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === "disable" || (hasPassword && !codePw)}
                title={hasPassword && !codePw ? "Wpisz hasło konta w polu poniżej" : undefined}
                onClick={async () => {
                  if (!confirm("Wyłączyć weryfikację dwuetapową? Logowanie będzie wymagało tylko hasła konta.")) return;
                  setBusy("disable");
                  const r = await authClient.twoFactor.disable(hasPassword ? { password: codePw } : ({} as { password: string }));
                  setBusy(null);
                  if (r.error) return toast.error(r.error.message ?? "Nie udało się wyłączyć 2FA");
                  setCodePw("");
                  toast.success("Wyłączono weryfikację dwuetapową");
                  router.refresh();
                }}
              >
                Wyłącz
              </Button>
            )}
          </div>
          {hasTotp ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Kody zapasowe</p>
              {codes ? (
                <ul className="secret grid grid-cols-2 gap-1 rounded-md border p-3 text-sm sm:grid-cols-5">
                  {codes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hasPassword ? <Input type="password" value={codePw} onChange={(e) => setCodePw(e.target.value)} placeholder="Hasło konta" className="max-w-xs" aria-label="Hasło konta (kody zapasowe lub wyłączenie 2FA)" /> : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === "codes" || (hasPassword && !codePw)}
                    onClick={async () => {
                      setBusy("codes");
                      const r = await authClient.twoFactor.generateBackupCodes(hasPassword ? { password: codePw } : ({} as { password: string }));
                      setBusy(null);
                      if (r.error) return toast.error(r.error.message ?? "Nie udało się");
                      setCodes(r.data?.backupCodes ?? []);
                      setCodePw("");
                      toast.success("Wygenerowano nowe kody — poprzednie przestały działać");
                    }}
                  >
                    Wygeneruj nowe kody zapasowe
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium">Passkeys</p>
            <ul className="space-y-1">
              {passkeys.data?.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <FingerprintPattern className="size-4" aria-hidden />
                  <span className="flex-1">{p.name ?? "Passkey"}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`Usuń passkey ${p.name ?? ""}`}
                    onClick={async () => {
                      const r = await authClient.passkey.deletePasskey({ id: p.id });
                      if (r.error) return toast.error(r.error.message ?? "Nie udało się");
                      await qc.invalidateQueries({ queryKey: ["passkeys"] });
                    }}
                  >
                    <Trash aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const name = prompt("Nazwa passkeya (np. MacBook, YubiKey)") ?? "Passkey";
                const r = await authClient.passkey.addPasskey({ name });
                if (r?.error) return toast.error(r.error.message ?? "Nie udało się dodać passkeya");
                toast.success("Dodano passkey");
                await qc.invalidateQueries({ queryKey: ["passkeys"] });
              }}
            >
              <FingerprintPattern aria-hidden /> Dodaj passkey
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktywne sesje i urządzenia</CardTitle>
          <CardDescription>Wyloguj urządzenia, których nie rozpoznajesz. O logowaniu z nowego urządzenia informujemy e-mailem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.isLoading ? <Loader2 className="animate-spin" aria-label="Ładowanie" /> : null}
          <ul className="divide-y rounded-md border">
            {sessions.data?.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3 text-sm">
                <Laptop className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {device(s.userAgent)} {s.id === currentSessionId ? <StatusBadge variant="ok">ta sesja</StatusBadge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.ipAddress ?? "IP nieznane"} · zalogowano {formatRelative(s.createdAt)} · wygasa {formatDateTime(s.expiresAt)}
                  </p>
                </div>
                {s.id !== currentSessionId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await authClient.revokeSession({ token: s.token });
                      await qc.invalidateQueries({ queryKey: ["sessions"] });
                    }}
                  >
                    <LogOut aria-hidden /> Wyloguj
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            onClick={async () => {
              await authClient.revokeOtherSessions();
              await qc.invalidateQueries({ queryKey: ["sessions"] });
              toast.success("Wylogowano pozostałe sesje");
            }}
          >
            Wyloguj wszystkie pozostałe sesje
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
