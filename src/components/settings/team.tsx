"use client";

import { Crown, Loader2, MailPlus, ShieldCheck, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/vault/badges";
import { fingerprint } from "@/lib/crypto/primitives";
import { decodePublicKey } from "@/lib/crypto/user-keys";
import { ensureCrypto } from "@/lib/crypto";
import type { MemberRow } from "@/lib/dal/team";
import type { OffboardingReport } from "@/lib/dal/team";
import { actionLabel } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";
import { canAssignRole, ROLE_LABELS, ROLES, type Role } from "@/lib/permissions";
import { unwrap } from "@/lib/vault/api";
import { StepUpCancelled, withStepUp } from "@/lib/vault/step-up";
import { rotateClientVault, syncVault } from "@/lib/vault/store";
import {
  approveKeysAction,
  changeRoleAction,
  inviteAction,
  leaveWorkspaceAction,
  offboardingReportAction,
  removeMemberAction,
  revokeInvitationAction,
  setExportPermissionAction,
  setSuspendedAction,
  transferOwnershipAction,
} from "@/server/actions/team";

type Invitation = { id: string; email: string; role: Role; expiresAt: string; invitedByName: string | null };

function fp(pk: string | null) {
  try {
    return pk ? fingerprint(decodePublicKey(pk)) : "—";
  } catch {
    return "—";
  }
}

async function guarded(reason: string, fn: () => Promise<unknown>) {
  try {
    await withStepUp(reason, fn);
    return true;
  } catch (e) {
    if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
    return false;
  }
}

function Offboarding({ member, clients, members, me, onDone }: { member: MemberRow; clients: { id: string; name: string; ownerUserId: string | null }[]; members: MemberRow[]; me: string; onDone: () => void }) {
  const [report, setReport] = useState<OffboardingReport | null>(null);
  const [tasks, setTasks] = useState<Map<string, string>>(new Map());
  const [busy, setBusy] = useState(false);
  const [rotating, setRotating] = useState<{ done: number; total: number } | null>(null);
  const others = members.filter((m) => m.userId !== member.userId && m.role !== "viewer");

  useEffect(() => {
    void offboardingReportAction(member.userId).then((r) => {
      if (!r.ok) return toast.error(r.error);
      setReport(r.data);
      const owners = new Map(clients.map((c) => [c.id, c.ownerUserId]));
      setTasks(new Map(r.data.accessed.map((a) => [a.credentialId, owners.get(a.clientId) && owners.get(a.clientId) !== member.userId ? owners.get(a.clientId)! : me])));
    });
  }, [member.userId, clients, me]);

  async function confirm() {
    setBusy(true);
    let rotate: string[] = [];
    const ok = await guarded("Usunięcie osoby z zespołu", async () => {
      const r = await unwrap(removeMemberAction(member.userId, [...tasks.entries()].map(([credentialId, assigneeUserId]) => ({ credentialId, assigneeUserId }))));
      rotate = r.rotateClientIds;
    });
    if (!ok) return setBusy(false);
    // Rotacja kluczy sejfów, do których osoba miała dostęp (w tej przeglądarce).
    await ensureCrypto();
    await syncVault();
    setRotating({ done: 0, total: rotate.length });
    let failed = 0;
    for (const [i, id] of rotate.entries()) {
      try {
        await rotateClientVault(id);
      } catch {
        failed++;
      }
      setRotating({ done: i + 1, total: rotate.length });
    }
    await syncVault();
    setBusy(false);
    toast.success(`Usunięto ${member.name}. Zrotowano klucze ${rotate.length - failed}/${rotate.length} sejfów.${failed ? " Pozostałe zostaną zrotowane automatycznie." : ""}`);
    onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onDone()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Offboarding: {member.name}</DialogTitle>
          <DialogDescription>
            Osoba straci dostęp natychmiast. Klucze sejfów, do których miała dostęp, zostaną zrotowane, a hasła, które wyświetlała lub kopiowała, trafią do zadań „zmień hasło”.
          </DialogDescription>
        </DialogHeader>
        {!report ? (
          <Loader2 className="animate-spin" aria-label="Ładowanie raportu" />
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              Dostęp do klientów: <strong>{report.clients.length}</strong> · dostępy wyświetlane, kopiowane lub edytowane: <strong>{report.accessed.length}</strong>
            </p>
            {report.accessed.length ? (
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {report.accessed.map((a) => (
                  <li key={a.credentialId} className="grid gap-2 rounded-md border p-2 text-sm sm:grid-cols-[auto_1fr_14rem] sm:items-center">
                    <Checkbox
                      checked={tasks.has(a.credentialId)}
                      onCheckedChange={(v) => {
                        const t = new Map(tasks);
                        if (v) t.set(a.credentialId, me);
                        else t.delete(a.credentialId);
                        setTasks(t);
                      }}
                      aria-label="Utwórz zadanie zmiany hasła"
                    />
                    <div className="min-w-0">
                      <p className="truncate">{a.clientName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.actions.map(actionLabel).join(", ")} · ostatnio {formatDateTime(a.lastAt)}
                      </p>
                    </div>
                    <Select value={tasks.get(a.credentialId)} onValueChange={(v) => setTasks(new Map(tasks).set(a.credentialId, v))} disabled={!tasks.has(a.credentialId)}>
                      <SelectTrigger aria-label="Osoba odpowiedzialna" className="w-full">
                        <SelectValue placeholder="Przypisz" />
                      </SelectTrigger>
                      <SelectContent>
                        {others.map((o) => (
                          <SelectItem key={o.userId} value={o.userId}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Osoba nie wyświetlała ani nie kopiowała haseł (wg dziennika).</p>
            )}
            {rotating ? (
              <div className="space-y-1">
                <p className="text-sm">
                  Rotacja kluczy sejfów: {rotating.done}/{rotating.total}
                </p>
                <Progress value={rotating.total ? (rotating.done / rotating.total) * 100 : 100} />
              </div>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="destructive" onClick={confirm} disabled={!report || busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <UserMinus aria-hidden />} Usuń i zrotuj klucze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamSettings({ members, invitations, clients, me, myRole, canManage }: { members: MemberRow[]; invitations: Invitation[]; clients: { id: string; name: string; ownerUserId: string | null }[]; me: string; myRole: Role; canManage: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [inviteClients, setInviteClients] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [offboard, setOffboard] = useState<MemberRow | null>(null);
  const refresh = () => router.refresh();

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await inviteAction({ email, role, clientIds: inviteClients });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(`Wysłano zaproszenie do ${email}`);
    setEmail("");
    setInviteClients([]);
    refresh();
  }

  return (
    <div className="space-y-6">
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MailPlus className="size-4" aria-hidden /> Zaproś osobę
            </CardTitle>
            <CardDescription>Domyślnie członek nie widzi żadnego klienta, dopóki nie zostanie do niego przypisany.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={invite} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-email">E-mail</Label>
                  <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-role">Rola</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger id="inv-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["admin", "member", "viewer"] as Role[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={busy || !email}>
                  {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Zaproś
                </Button>
              </div>
              {role === "member" || role === "viewer" ? (
                <fieldset>
                  <legend className="mb-1 text-sm">Przypisz do klientów (opcjonalnie)</legend>
                  <div className="flex max-h-32 flex-wrap gap-3 overflow-y-auto">
                    {clients.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5">
                        <Checkbox id={`inv-c-${c.id}`} checked={inviteClients.includes(c.id)} onCheckedChange={(v) => setInviteClients(v ? [...inviteClients, c.id] : inviteClients.filter((x) => x !== c.id))} />
                        <Label htmlFor={`inv-c-${c.id}`} className="font-normal">{c.name}</Label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </form>
            {invitations.length ? (
              <ul className="mt-4 divide-y rounded-md border">
                {invitations.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                    <span>
                      {i.email} · {ROLE_LABELS[i.role]} <span className="text-xs text-muted-foreground">· ważne do {formatDateTime(i.expiresAt)}</span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={async () => (await revokeInvitationAction(i.id), refresh())}>
                      Anuluj
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Członkowie ({members.length})</CardTitle>
          <CardDescription>Odciski kluczy publicznych pozwalają zweryfikować osoby poza systemem (np. telefonicznie).</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border">
            {members.map((m) => (
              <li key={m.userId} className="space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {m.name} {m.userId === me ? <span className="text-xs text-muted-foreground">(Ty)</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.email} · dołączył(a) {formatDateTime(m.joinedAt)} · klientów: {m.role === "owner" || m.role === "admin" ? "wszyscy" : m.clients.length}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Odcisk klucza: <span className="secret">{fp(m.publicKey)}</span>
                    </p>
                  </div>
                  {m.status === "suspended" ? <StatusBadge variant="danger">zawieszony</StatusBadge> : null}
                  {m.pendingKeyApproval ? <StatusBadge variant="warn">czeka na zatwierdzenie kluczy</StatusBadge> : null}
                  {!m.publicKey ? <StatusBadge>bez sejfu</StatusBadge> : null}
                  {canManage && m.userId !== me && canAssignRole(myRole, m.role, m.role === "owner" ? "admin" : m.role) ? (
                    <Select value={m.role} onValueChange={async (v) => (await guarded("Zmiana roli", () => unwrap(changeRoleAction(m.userId, v)))) && refresh()}>
                      <SelectTrigger className="h-8 w-40" aria-label={`Rola: ${m.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.filter((r) => r !== "owner").map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge variant={m.role === "owner" ? "info" : "muted"}>
                      {m.role === "owner" ? <Crown className="size-3" aria-hidden /> : null} {ROLE_LABELS[m.role]}
                    </StatusBadge>
                  )}
                </div>
                {canManage && m.userId !== me && m.role !== "owner" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {myRole === "owner" && m.role === "admin" ? (
                      <span className="flex items-center gap-2 text-sm">
                        <Switch id={`exp-${m.userId}`} checked={m.canExport} onCheckedChange={async (v) => (await guarded("Uprawnienie eksportu", () => unwrap(setExportPermissionAction(m.userId, v)))) && refresh()} />
                        <Label htmlFor={`exp-${m.userId}`} className="font-normal">Eksport danych</Label>
                      </span>
                    ) : null}
                    {m.pendingKeyApproval ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!confirm(`Czy zweryfikowałeś(-aś) tożsamość osoby ${m.name} innym kanałem i porównałeś(-aś) odcisk klucza ${fp(m.publicKey)}?`)) return;
                          if (await guarded("Zatwierdzenie kluczy", () => unwrap(approveKeysAction(m.userId)))) {
                            await syncVault().catch(() => {});
                            toast.success("Zatwierdzono — kopie kluczy zostaną nadane");
                            refresh();
                          }
                        }}
                      >
                        <ShieldCheck aria-hidden /> Zatwierdź klucze
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={async () => (await setSuspendedAction(m.userId, m.status !== "suspended"), refresh())}>
                      {m.status === "suspended" ? "Przywróć dostęp" : "Zawieś dostęp"}
                    </Button>
                    {myRole === "owner" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm(`Przenieść własność przestrzeni na ${m.name}? Zostaniesz administratorem.`)) return;
                          if (await guarded("Przeniesienie własności", () => unwrap(transferOwnershipAction(m.userId)))) refresh();
                        }}
                      >
                        <Crown aria-hidden /> Przekaż własność
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setOffboard(m)}>
                      <UserMinus aria-hidden /> Usuń z zespołu
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {myRole !== "owner" ? (
            <Button
              variant="outline"
              className="mt-4"
              onClick={async () => {
                if (!confirm("Opuścić przestrzeń? Stracisz dostęp do wszystkich jej klientów.")) return;
                const r = await leaveWorkspaceAction();
                if (!r.ok) return toast.error(r.error);
                router.push("/dashboard");
                router.refresh();
              }}
            >
              Opuść przestrzeń
            </Button>
          ) : null}
        </CardContent>
      </Card>
      {offboard ? <Offboarding member={offboard} clients={clients} members={members} me={me} onDone={() => (setOffboard(null), refresh())} /> : null}
    </div>
  );
}
