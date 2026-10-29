"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserPreferences } from "@/lib/db/schema";
import { useVault } from "@/lib/vault/store";
import { updatePreferencesAction } from "@/server/actions/account";

export function PreferencesForm({ preferences }: { preferences: UserPreferences }) {
  const router = useRouter();
  const [p, setP] = useState({
    autoLockMinutes: preferences.autoLockMinutes ?? 15,
    clipboardClearSeconds: preferences.clipboardClearSeconds ?? 30,
    revealSeconds: preferences.revealSeconds ?? 30,
    showFavicons: preferences.showFavicons ?? false,
    emailNotifications: preferences.emailNotifications ?? true,
  });
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const r = await updatePreferencesAction(p);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    const user = useVault.getState().user;
    if (user) useVault.setState({ user: { ...user, preferences: { ...user.preferences, ...p } } });
    toast.success("Zapisano preferencje");
    router.refresh();
  }
  const num = (k: keyof typeof p, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: Math.max(min, Math.min(max, Number(e.target.value) || min)) });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sejf i powiadomienia e-mail</CardTitle>
        <CardDescription>Ustawienia dotyczą Twojego konta na wszystkich urządzeniach.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pr-lock">Auto-blokada po (min)</Label>
            <Input id="pr-lock" type="number" min={1} max={240} value={p.autoLockMinutes} onChange={num("autoLockMinutes", 1, 240)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-clip">Czyszczenie schowka (s)</Label>
            <Input id="pr-clip" type="number" min={5} max={600} value={p.clipboardClearSeconds} onChange={num("clipboardClearSeconds", 5, 600)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-rev">Odsłonięcie hasła (s)</Label>
            <Input id="pr-rev" type="number" min={5} max={300} value={p.revealSeconds} onChange={num("revealSeconds", 5, 300)} />
          </div>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="pr-fav">Ikony serwisów (favicony)</Label>
            <p className="text-xs text-muted-foreground">Pobierane z zewnętrznej usługi (DuckDuckGo) — ujawnia jej domeny z Twojego sejfu. Domyślnie wyłączone.</p>
          </div>
          <Switch id="pr-fav" checked={p.showFavicons} onCheckedChange={(v) => setP({ ...p, showFavicons: v })} />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="pr-mail">Powiadomienia e-mail</Label>
            <p className="text-xs text-muted-foreground">Przypomnienia, alerty, prośby o dostęp. Nigdy nie zawierają sekretów.</p>
          </div>
          <Switch id="pr-mail" checked={p.emailNotifications} onCheckedChange={(v) => setP({ ...p, emailNotifications: v })} />
        </div>
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Zapisz preferencje
        </Button>
      </CardContent>
    </Card>
  );
}
