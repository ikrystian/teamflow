"use client";

import { Ellipsis, ExternalLink, ImageUp, Inbox, Package, Pencil, Star, Trash, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { unwrap } from "@/lib/vault/api";
import { StepUpCancelled, withStepUp } from "@/lib/vault/step-up";
import { syncVault } from "@/lib/vault/store";
import type { Role } from "@/lib/permissions";
import { deleteClientAction, setClientLogoAction, toggleFavoriteAction } from "@/server/actions/clients";
import { ClientFormDialog, type ClientFormValue } from "./client-form";
import { ClientLogo, ClientStatusBadge } from "./client-status";
import { ClientTeamDialog } from "./client-team-dialog";
import { HandoverDialog } from "./handover-dialog";
import { RequestAccessDialog } from "./request-access-dialog";

type Props = {
  client: {
    id: string;
    name: string;
    status: "lead" | "active" | "paused" | "ended";
    website: string | null;
    logo: string | null;
    favorite: boolean;
    taxId: string | null;
    industry: string | null;
    address: ClientFormValue["address"];
    ownerUserId: string | null;
    tags: string[];
    services: string[];
  };
  team: { userId: string; canViewCritical: boolean }[];
  permissions: { canEdit: boolean; canEditCrm: boolean; canViewCritical: boolean; canDelete: boolean; canAssign: boolean };
  canShareExternal: boolean;
  members: { userId: string; name: string; role: Role }[];
  maxShareHours: number;
};

/** Zmniejsza logo do 256 px (PNG) w przeglądarce przed wysłaniem. */
async function resizeLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Logo musi być obrazem PNG, JPEG lub WebP");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function ClientHeader({ client, team, permissions, canShareExternal, members, maxShareHours }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "edit" | "team" | "request" | "handover" | "delete">(null);
  const [confirm, setConfirm] = useState("");
  const [, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onLogo(f: File | undefined) {
    if (!f) return;
    try {
      const r = await setClientLogoAction(client.id, await resizeLogo(f));
      if (!r.ok) throw new Error(r.error);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onDelete() {
    try {
      await withStepUp("Usunięcie klienta", () => unwrap(deleteClientAction(client.id)));
      toast.success("Usunięto klienta i jego sejf");
      await syncVault();
      router.push("/dashboard/clients");
    } catch (e) {
      if (!(e instanceof StepUpCancelled)) toast.error((e as Error).message);
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button type="button" className="relative" onClick={() => permissions.canEditCrm && fileRef.current?.click()} aria-label="Zmień logo klienta" disabled={!permissions.canEditCrm}>
          <ClientLogo logo={client.logo} name={client.name} className="size-12" />
          {permissions.canEditCrm ? <ImageUp className="absolute -right-1 -bottom-1 size-4 rounded bg-background p-0.5 shadow" aria-hidden /> : null}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-2xl font-semibold tracking-tight">
            {client.name}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-pressed={client.favorite}
              aria-label={client.favorite ? "Odepnij klienta" : "Przypnij klienta"}
              onClick={() => start(async () => (await toggleFavoriteAction(client.id), router.refresh()))}
            >
              <Star className={client.favorite ? "fill-amber-400 text-amber-500" : ""} aria-hidden />
            </Button>
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <ClientStatusBadge status={client.status} />
            {client.website ? (
              <a href={client.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                {client.website.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : null}
            {client.taxId ? <span>NIP {client.taxId}</span> : null}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {permissions.canEdit ? (
          <Button variant="outline" onClick={() => setDialog("request")}>
            <Inbox aria-hidden /> Poproś o dostępy
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Więcej akcji klienta">
              <Ellipsis aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {permissions.canEditCrm ? (
              <DropdownMenuItem onSelect={() => setDialog("edit")}>
                <Pencil aria-hidden /> Edytuj dane
              </DropdownMenuItem>
            ) : null}
            {permissions.canAssign ? (
              <DropdownMenuItem onSelect={() => setDialog("team")}>
                <Users aria-hidden /> Zespół klienta
              </DropdownMenuItem>
            ) : null}
            {canShareExternal && permissions.canEdit && permissions.canViewCritical ? (
              <DropdownMenuItem onSelect={() => setDialog("handover")}>
                <Package aria-hidden /> Pakiet przekazania
              </DropdownMenuItem>
            ) : null}
            {permissions.canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                  <Trash aria-hidden /> Usuń klienta
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {dialog === "edit" ? (
        <ClientFormDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          clientId={client.id}
          members={members}
          initial={{
            name: client.name,
            taxId: client.taxId ?? "",
            status: client.status,
            website: client.website ?? "",
            industry: client.industry ?? "",
            address: client.address,
            ownerUserId: client.ownerUserId ?? "",
            tags: client.tags,
            services: client.services,
          }}
        />
      ) : null}
      {dialog === "team" ? <ClientTeamDialog clientId={client.id} members={members} team={team} onClose={() => setDialog(null)} /> : null}
      {dialog === "request" ? <RequestAccessDialog clientId={client.id} clientName={client.name} onClose={() => setDialog(null)} /> : null}
      {dialog === "handover" ? <HandoverDialog clientId={client.id} clientName={client.name} maxHours={maxShareHours} onClose={() => setDialog(null)} /> : null}

      <AlertDialog open={dialog === "delete"} onOpenChange={(o) => !o && (setDialog(null), setConfirm(""))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć klienta „{client.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Usunięte zostaną: sejf z wszystkimi dostępami, kontakty, domeny i notatki. Operacji nie można cofnąć i wymaga ponownego potwierdzenia tożsamości. Rozważ zamiast tego status „Zakończony” (archiwum).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={`Wpisz: ${client.name}`} aria-label="Potwierdź nazwę klienta" />
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction disabled={confirm !== client.name} onClick={onDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Usuń na zawsze
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
