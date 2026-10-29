"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { parseTotp, totp } from "@/lib/crypto/totp";
import { copySecret } from "@/lib/vault/clipboard";
import { StepUpCancelled } from "@/lib/vault/step-up";
import { logEvent, revealSecrets, useVault, type VaultItem } from "@/lib/vault/store";
import { openableUrl, primarySecret } from "@/lib/vault/types";

export function usePrefs() {
  const prefs = useVault((s) => s.user?.preferences);
  return { clipboardSeconds: prefs?.clipboardClearSeconds ?? 30, revealSeconds: prefs?.revealSeconds ?? 30, showFavicons: prefs?.showFavicons ?? false };
}

function handleError(e: unknown) {
  if (e instanceof StepUpCancelled) return;
  toast.error((e as Error).message);
}

/**
 * Szybkie akcje bez otwierania wpisu (rozdział 4.4). Każde skopiowanie i odsłonięcie
 * jest zgłaszane do dziennika zdarzeń.
 */
export function useCredentialActions() {
  const { clipboardSeconds } = usePrefs();

  const copyLogin = useCallback(
    async (item: VaultItem) => {
      if (!item.overview?.login) return;
      try {
        await copySecret(item.overview.login, clipboardSeconds);
        logEvent("credential.copy_login", item.id);
        toast.success("Skopiowano login");
      } catch (e) {
        handleError(e);
      }
    },
    [clipboardSeconds],
  );

  const copyPassword = useCallback(
    async (item: VaultItem) => {
      try {
        const secrets = await revealSecrets(item.id, "copy");
        const value = primarySecret(item.type, secrets);
        if (!value) return toast.info("Ten wpis nie ma hasła");
        await copySecret(value, clipboardSeconds);
        logEvent("credential.copy_password", item.id);
        toast.success(`Skopiowano hasło — schowek zostanie wyczyszczony za ${clipboardSeconds} s`);
      } catch (e) {
        handleError(e);
      }
    },
    [clipboardSeconds],
  );

  const copyTotp = useCallback(
    async (item: VaultItem) => {
      try {
        const secrets = await revealSecrets(item.id, "totp");
        if (!secrets.totp) return toast.info("Ten wpis nie ma sekretu 2FA");
        const { code, remaining } = await totp(parseTotp(secrets.totp));
        await copySecret(code, Math.min(clipboardSeconds, remaining + 5));
        logEvent("credential.copy_totp", item.id);
        toast.success(`Skopiowano kod 2FA (ważny ${remaining} s)`);
      } catch (e) {
        handleError(e);
      }
    },
    [clipboardSeconds],
  );

  const openUrl = useCallback((item: VaultItem) => {
    const url = item.overview ? openableUrl(item.type, item.overview) : null;
    if (!url) return toast.info("Brak adresu do otwarcia");
    window.open(url, "_blank", "noopener,noreferrer");
    logEvent("credential.open_url", item.id);
  }, []);

  const copyText = useCallback(
    async (item: VaultItem, value: string, label: string, secret: boolean) => {
      try {
        await copySecret(value, secret ? clipboardSeconds : 0);
        if (secret) logEvent("credential.copy_field", item.id, { field: label });
        toast.success(`Skopiowano: ${label}`);
      } catch (e) {
        handleError(e);
      }
    },
    [clipboardSeconds],
  );

  return { copyLogin, copyPassword, copyTotp, openUrl, copyText, handleError };
}
