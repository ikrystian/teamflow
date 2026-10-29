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
import { cn } from "@/lib/utils";
import { unwrap } from "@/lib/vault/api";
import { StepUpCancelled, withStepUp } from "@/lib/vault/step-up";
import { lockVault } from "@/lib/vault/store";
import { changePlanAction, deleteWorkspaceAction, updateWorkspaceSettingsAction } from "@/server/actions/workspace";

type Settings = {
  membersCanShareExternally: boolean;
  auditRetentionMonths: number;
  archivedClientCleanupDays: number;
  maxShareHours: number;
  massCopyThreshold: number;
  passwordMaxAgeDays: number;
  expiryReminderDays: number[];
  slackWebhookUrl: string;
  teamsWebhookUrl: string;
};

export function WorkspaceSettingsForm({ canEdit, name, plan, plans, settings }: { canEdit: boolean; name: string; plan: string; plans: { id: string; name: string; price: string; limits: string }[]; settings: Settings }) {
  const router = useRouter();
  const [n, setN] = useState(name);
  const [s, setS] = useState(settings);
  const [days, setDays] = useState(settings.expiryReminderDays.join(", "));
  const [busy, setBusy] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const expiryReminderDays = days
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((x) => Number.isInteger(x) && x >= 0);
    const r = await updateWorkspaceSettingsAction({ ...s, name: n, expiryReminderDays });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success("Zapisano ustawienia przestrzeni");
    router.refresh();
  }

  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ustawienia przestrzeni</CardTitle>
          <CardDescription>{canEdit ? "Zmienia je właściciel przestrzeni." : "Tylko właściciel może zmieniać ustawienia — widzisz je w trybie odczytu."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={!canEdit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name">Nazwa</Label>
                <Input id="ws-name" value={n} onChange={(e) => setN(e.target.value)} />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="ws-share">Członkowie mogą tworzyć linki jednorazowe na zewnątrz</Label>
                  <p className="text-xs text-muted-foreground">Właściciel i administratorzy mogą zawsze.</p>
                </div>
                <Switch id="ws-share" checked={s.membersCanShareExternally} onCheckedChange={(v) => setS({ ...s, membersCanShareExternally: v })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ws-ret">Retencja dziennika (mies.)</Label>
                  <Input id="ws-ret" type="number" min={1} max={120} value={s.auditRetentionMonths} onChange={num("auditRetentionMonths")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws-share-h">Maks. ważność linku (h)</Label>
                  <Input id="ws-share-h" type="number" min={1} max={168} value={s.maxShareHours} onChange={num("maxShareHours")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws-age">Hasło „stare” po (dniach)</Label>
                  <Input id="ws-age" type="number" min={30} max={3650} value={s.passwordMaxAgeDays} onChange={num("passwordMaxAgeDays")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws-mass">Alert: kopii w 10 min</Label>
                  <Input id="ws-mass" type="number" min={3} max={1000} value={s.massCopyThreshold} onChange={num("massCopyThreshold")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws-clean">Usunięcie dostępów po zakończeniu (dni)</Label>
                  <Input id="ws-clean" type="number" min={7} max={3650} value={s.archivedClientCleanupDays} onChange={num("archivedClientCleanupDays")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws-days">Przypomnienia o wygasaniu (dni przed)</Label>
                  <Input id="ws-days" value={days} onChange={(e) => setDays(e.target.value)} placeholder="30, 14, 7, 1" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ws-slack">Webhook Slack</Label>
                  <Input id="ws-slack" value={s.slackWebhookUrl} onChange={(e) => setS({ ...s, slackWebhookUrl: e.target.value })} placeholder="https://hooks.slack.com/services/…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws-teams">Webhook Microsoft Teams</Label>
                  <Input id="ws-teams" value={s.teamsWebhookUrl} onChange={(e) => setS({ ...s, teamsWebhookUrl: e.target.value })} placeholder="https://…webhook.office.com/…" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Do Slacka i Teams trafiają tylko tytuły alertów i przypomnień z linkiem — nigdy sekrety.</p>
            </fieldset>
            {canEdit ? (
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Zapisz
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan i płatności</CardTitle>
          <CardDescription>Bieżący plan: {plans.find((p) => p.id === plan)?.name ?? plan}. Integracja z operatorem płatności jest decyzją do potwierdzenia (model SaaS).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className={cn("space-y-2 rounded-lg border p-4", p.id === plan && "border-primary")}>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm">{p.price}</p>
                <p className="text-xs text-muted-foreground">{p.limits}</p>
                {canEdit && p.id !== plan ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const r = await changePlanAction(p.id);
                      if (!r.ok) return toast.error(r.error);
                      router.refresh();
                    }}
                  >
                    Wybierz
                  </Button>
                ) : p.id === plan ? (
                  <p className="text-xs font-medium">Aktywny</p>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Usuń przestrzeń</CardTitle>
            <CardDescription>Usunięcie danych na żądanie (RODO): klienci, sejfy, dziennik i zespół zostaną trwale usunięte. Wymaga potwierdzenia tożsamości.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={`Wpisz: ${name}`} className="max-w-xs" aria-label="Potwierdź nazwę przestrzeni" />
            <Button
              variant="destructive"
              disabled={confirmName !== name}
              onClick={async () => {
                try {
                  await withStepUp("Usunięcie przestrzeni", () => unwrap(deleteWorkspaceAction(confirmName)));
                  lockVault("workspace_deleted");
                  router.push("/auth/signup/workspace");
                  router.refresh();
                } catch (e) {
                  if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
                }
              }}
            >
              Usuń przestrzeń na zawsze
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
