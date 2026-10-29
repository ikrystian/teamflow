"use client";

/**
 * Sejf w pamięci karty (rozdział 6.4): odszyfrowane klucze żyją wyłącznie w pamięci —
 * nigdy w localStorage ani IndexedDB — i są zerowane przy blokadzie sejfu.
 * Materiał kluczy trzymamy w zmiennych modułu (poza stanem reaktywnym), a stan
 * zawiera tylko to, co potrzebne do renderowania.
 */
import { create } from "zustand";
import {
  createUserKeys,
  decryptAttachmentBody,
  decryptAttachmentMeta,
  decryptCredentialOverview,
  decryptCredentialSecrets,
  deriveMasterKeys,
  encryptAttachment,
  encryptCredentialPayload,
  ensureCrypto,
  generateIntakeKeyPair,
  generateItemKey,
  generateVaultKey,
  openIntakeSubmission,
  openKeyGrant,
  packIntakeKeyPair,
  rewrapPrivateKey,
  sealIntakeSubmission,
  sealKeyFor,
  unlockWithMasterPassword,
  unlockWithRecoveryKey,
  unpackIntakeKeyPair,
  unwrapItemKey,
  unwrapPrivateKeyWithPrf,
  wipe,
  wrapItemKey,
  type KdfParams,
  type KeyPair,
} from "@/lib/crypto";
import { fingerprint as fingerprintOf, publicKeyFromPrivate } from "@/lib/crypto/primitives";
import { toBase64Url } from "@/lib/crypto/encoding";
import { evaluatePassword } from "@/lib/crypto/strength";
import type { UserPreferences } from "@/lib/db/schema";
import type { CredentialRecord, PendingGrant, VaultClient, VaultSync } from "@/lib/dal/vault";
import { logClientEventAction, rewrapMasterAction, resetKeysAction } from "@/server/actions/account";
import {
  importCredentialsAction,
  moveCredentialsAction,
  rotateClientKeyAction,
  rotateIntakeKeyAction,
  saveCredentialAction,
  saveCredentialsAction,
  submitGrantsAction,
} from "@/server/actions/vault";
import { api, ApiError, unwrap } from "./api";
import { buildIndex, searchIndex, type IndexEntry } from "./search";
import { withStepUp } from "./step-up";
import {
  emptySecrets,
  extractExpiry,
  primarySecret,
  type CredentialOverview,
  type CredentialSecrets,
  type CredentialType,
  type Sensitivity,
} from "./types";

export type KeyBundle = {
  userId: string;
  name: string;
  email: string;
  publicKey: string;
  encryptedPrivateKey: string;
  recoveryEncryptedPrivateKey: string;
  kdfSalt: string;
  kdfParams: KdfParams;
  keysVersion: number;
  preferences: UserPreferences;
};

export type VaultItem = CredentialRecord & {
  clientName: string;
  overview: CredentialOverview | null;
  /** Null: wpis krytyczny przed odsłonięciem albo brak dostępu do sekretów. */
  secrets: CredentialSecrets | null;
  error: string | null;
};

type Status = "locked" | "unlocking" | "unlocked";

type VaultState = {
  status: Status;
  user: Omit<KeyBundle, "encryptedPrivateKey" | "recoveryEncryptedPrivateKey"> | null;
  clients: VaultClient[];
  items: VaultItem[];
  intake: VaultSync["intake"] | null;
  syncing: boolean;
  lastSync: number | null;
  lockReason: string | null;
  index: IndexEntry[];
  /** Wyniki Pwned Passwords (id wpisu → liczba wystąpień) — tylko w pamięci, czyszczone przy blokadzie. */
  breached: Record<string, number>;
  breachCheckedAt: number | null;
};

// --- Materiał kluczy (tylko pamięć modułu) -----------------------------------------
let keyPair: KeyPair | null = null;
const vaultKeys = new Map<string, { version: number; key: Uint8Array }>();
const itemKeys = new Map<string, Uint8Array>();
const directKeys = new Map<string, Uint8Array>();
let intakeKeyPair: KeyPair | null = null;
let intakeVersion = 0;

function wipeAll() {
  if (keyPair) wipe(keyPair.privateKey);
  keyPair = null;
  for (const v of vaultKeys.values()) wipe(v.key);
  vaultKeys.clear();
  for (const k of itemKeys.values()) wipe(k);
  itemKeys.clear();
  for (const k of directKeys.values()) wipe(k);
  directKeys.clear();
  if (intakeKeyPair) wipe(intakeKeyPair.privateKey);
  intakeKeyPair = null;
  intakeVersion = 0;
}

/** Do testów kryterium „po blokadzie klucze znikają z pamięci”. */
export function keyMaterialSize() {
  return { keyPair: keyPair ? 1 : 0, vaultKeys: vaultKeys.size, itemKeys: itemKeys.size, directKeys: directKeys.size, intake: intakeKeyPair ? 1 : 0 };
}

const initial: VaultState = {
  status: "locked",
  user: null,
  clients: [],
  items: [],
  intake: null,
  syncing: false,
  lastSync: null,
  lockReason: null,
  index: [],
  breached: {},
  breachCheckedAt: null,
};

export const useVault = create<VaultState>(() => ({ ...initial }));

/** Zgłoszenie zdarzenia do dziennika (wyświetlenie, skopiowanie). Nazwę akcji waliduje serwer. */
export function logEvent(action: string, credentialId?: string, metadata?: Record<string, string | number | boolean>) {
  void logClientEventAction({ action, credentialId, metadata }).catch(() => {});
}

// --- Odblokowanie --------------------------------------------------------------------

async function fetchBundle(): Promise<KeyBundle> {
  return api<KeyBundle>("/api/vault/bundle");
}

function stored(b: KeyBundle) {
  return { userId: b.userId, publicKey: b.publicKey, encryptedPrivateKey: b.encryptedPrivateKey, recoveryEncryptedPrivateKey: b.recoveryEncryptedPrivateKey, kdfSalt: b.kdfSalt, kdfParams: b.kdfParams };
}

async function finishUnlock(b: KeyBundle, kp: KeyPair, method: string) {
  keyPair = kp;
  const { encryptedPrivateKey: _a, recoveryEncryptedPrivateKey: _b, ...user } = b;
  useVault.setState({ status: "unlocked", user, lockReason: null });
  logEvent("vault.unlock", undefined, { method });
  await syncVault();
}

export async function unlockWithPassword(masterPassword: string) {
  useVault.setState({ status: "unlocking" });
  try {
    await ensureCrypto();
    const b = await fetchBundle();
    const { keyPair: kp } = await unlockWithMasterPassword(stored(b), masterPassword);
    await finishUnlock(b, kp, "master_password");
  } catch (e) {
    useVault.setState({ status: "locked" });
    logEvent("vault.unlock_failed", undefined, { method: "master_password" });
    throw e;
  }
}

/** Odzyskanie kluczem odzyskiwania i ustawienie nowego hasła głównego. */
export async function recoverWithKey(recoveryKey: string, newMasterPassword: string, newRecoveryKey: boolean) {
  await ensureCrypto();
  const b = await fetchBundle();
  const kp = await unlockWithRecoveryKey(stored(b), recoveryKey);
  const re = await rewrapPrivateKey(b.userId, kp, newMasterPassword, { newRecoveryKey });
  await unwrap(rewrapMasterAction({ encryptedPrivateKey: re.encryptedPrivateKey, kdfSalt: re.kdfSalt, kdfParams: re.kdfParams, authKey: re.authKey, recoveryEncryptedPrivateKey: re.recoveryEncryptedPrivateKey }, "recovery"));
  logEvent("vault.recovery_used");
  await finishUnlock({ ...b, kdfSalt: re.kdfSalt, kdfParams: re.kdfParams, encryptedPrivateKey: re.encryptedPrivateKey }, kp, "recovery_key");
  return re.recoveryKey ?? null;
}

/** Odblokowanie passkeyem z rozszerzeniem PRF (faza kolejna — eksperymentalnie). */
export async function unlockWithPrf(prfOutput: Uint8Array, wrapped: string, credentialId: string) {
  await ensureCrypto();
  const b = await fetchBundle();
  const priv = unwrapPrivateKeyWithPrf(wrapped, prfOutput, b.userId, credentialId);
  const pub = publicKeyFromPrivate(priv);
  if (toBase64Url(pub) !== b.publicKey) throw new Error("Klucz nie pasuje do konta");
  await finishUnlock(b, { privateKey: priv, publicKey: pub }, "passkey_prf");
}

/** Zmiana hasła głównego przy odblokowanym sejfie (wymaga step-up). */
export async function changeMasterPassword(newMasterPassword: string, newRecoveryKey: boolean) {
  const user = useVault.getState().user;
  if (!keyPair || !user) throw new Error("Sejf jest zablokowany");
  const re = await rewrapPrivateKey(user.userId, keyPair, newMasterPassword, { newRecoveryKey });
  await withStepUp("Zmiana hasła głównego", () =>
    unwrap(rewrapMasterAction({ encryptedPrivateKey: re.encryptedPrivateKey, kdfSalt: re.kdfSalt, kdfParams: re.kdfParams, authKey: re.authKey, recoveryEncryptedPrivateKey: re.recoveryEncryptedPrivateKey }, "change")),
  );
  useVault.setState({ user: { ...user, kdfSalt: re.kdfSalt, kdfParams: re.kdfParams } });
  return re.recoveryKey ?? null;
}

/**
 * Odzyskiwanie w zespole: nowe klucze (stare dane są nie do odszyfrowania bez kopii),
 * administrator po weryfikacji zatwierdza ponowne nadanie kopii kluczy sejfów.
 */
export async function resetKeys(newMasterPassword: string) {
  await ensureCrypto();
  const b = await fetchBundle();
  const created = await createUserKeys(b.userId, newMasterPassword);
  await unwrap(resetKeysAction(created.bundle));
  await finishUnlock({ ...b, ...created.bundle, keysVersion: b.keysVersion + 1 }, created.keyPair, "keys_reset");
  return created.recoveryKey;
}

export function lockVault(reason: string | null = null) {
  if (useVault.getState().status === "unlocked") logEvent("vault.lock", undefined, { reason: reason ?? "manual" });
  wipeAll();
  useVault.setState({ ...initial, lockReason: reason });
}

/** Parametry KDF potrzebne dialogowi step-up do wyprowadzenia klucza uwierzytelniającego. */
export async function deriveAuthKeyForStepUp(masterPassword: string) {
  const user = useVault.getState().user ?? (await fetchBundle());
  const { authKey, encryptionKey } = await deriveMasterKeys(masterPassword, user.kdfSalt, user.kdfParams);
  wipe(encryptionKey);
  const b64 = toBase64Url(authKey);
  wipe(authKey);
  return b64;
}

// --- Synchronizacja i odszyfrowanie ---------------------------------------------------------

function requireKeyPair() {
  if (!keyPair) throw new Error("Sejf jest zablokowany");
  return keyPair;
}

function decryptRecord(r: CredentialRecord, clientName: string): VaultItem {
  try {
    let itemKey = itemKeys.get(r.id);
    if (!itemKey) {
      if (r.direct) {
        itemKey = directKeys.get(r.id);
        if (!itemKey) throw new Error("Brak kopii klucza wpisu — poczekaj, aż osoba udostępniająca odblokuje sejf");
      } else {
        const vk = vaultKeys.get(r.clientId);
        if (!vk || vk.version !== r.vaultKeyVersion) throw new Error("Brak klucza sejfu klienta — kopia zostanie nadana, gdy ktoś z dostępem odblokuje sejf");
        itemKey = unwrapItemKey(vk.key, r.encryptedItemKey, r.id, r.clientId, r.vaultKeyVersion);
      }
      itemKeys.set(r.id, itemKey);
    }
    const overview = decryptCredentialOverview<CredentialOverview>(itemKey, r.id, r.encryptedData);
    const secrets = r.encryptedSecrets ? decryptCredentialSecrets<CredentialSecrets>(itemKey, r.id, r.encryptedSecrets) : null;
    return { ...r, clientName, overview, secrets, error: null };
  } catch (e) {
    return { ...r, clientName, overview: null, secrets: null, error: (e as Error).message };
  }
}

function rebuildIndex(items: VaultItem[]) {
  return buildIndex(
    items
      .filter((i) => i.overview)
      .map((i) => ({
        id: i.id,
        name: i.overview!.name,
        clientName: i.clientName,
        url: i.overview!.url,
        login: i.overview!.login,
        tags: i.overview!.tags,
        extra: [i.overview!.fields.host ?? "", i.overview!.fields.platform ?? "", i.overview!.fields.domain ?? ""],
      })),
  );
}

let syncPromise: Promise<void> | null = null;

export function syncVault(): Promise<void> {
  if (!syncPromise) {
    syncPromise = doSync().finally(() => {
      syncPromise = null;
    });
  }
  return syncPromise;
}

async function doSync() {
  const kp = requireKeyPair();
  useVault.setState({ syncing: true });
  try {
    const data = await api<VaultSync>("/api/vault/sync");
    if (!keyPair) return; // zablokowano w trakcie
    for (const g of data.grants) {
      try {
        if (g.scopeType === "client") {
          const cur = vaultKeys.get(g.scopeId);
          if (cur && cur.version >= g.keyVersion) continue;
          vaultKeys.set(g.scopeId, { version: g.keyVersion, key: openKeyGrant(kp, g.encryptedKey, "client", g.scopeId, g.keyVersion) });
        } else if (g.scopeType === "intake") {
          if (g.keyVersion !== data.intake.keyVersion || intakeVersion === g.keyVersion) continue;
          intakeKeyPair = unpackIntakeKeyPair(openKeyGrant(kp, g.encryptedKey, "intake", g.scopeId, g.keyVersion));
          intakeVersion = g.keyVersion;
        } else if (!directKeys.has(g.scopeId)) {
          directKeys.set(g.scopeId, openKeyGrant(kp, g.encryptedKey, "credential", g.scopeId, g.keyVersion));
        }
      } catch {
        // Uszkodzona lub podmieniona kopia klucza — wpisy tego zakresu pokażą błąd.
      }
    }
    // Po rotacji klucza sejfu stare klucze wpisów (zawinięte starym kluczem) trzeba odświeżyć.
    for (const r of data.credentials) {
      const vk = vaultKeys.get(r.clientId);
      if (!r.direct && vk && vk.version !== r.vaultKeyVersion) itemKeys.delete(r.id);
    }
    const names = new Map(data.clients.map((c) => [c.id, c.name]));
    const prev = new Map(useVault.getState().items.map((i) => [i.id, i]));
    const items = data.credentials.map((r) => {
      const it = decryptRecord(r, names.get(r.clientId) ?? "Udostępnione mi");
      // Zachowujemy odsłonięte sekrety wpisów krytycznych do czasu blokady.
      const old = prev.get(r.id);
      if (!it.secrets && old?.secrets && old.updatedAt === r.updatedAt) it.secrets = old.secrets;
      return it;
    });
    useVault.setState({ clients: data.clients, items, intake: data.intake, lastSync: Date.now(), index: rebuildIndex(items) });
    void processBackgroundKeyWork(data).catch(() => {});
  } finally {
    useVault.setState({ syncing: false });
  }
}

export function searchVault(query: string): VaultItem[] {
  const { index, items } = useVault.getState();
  const byId = new Map(items.map((i) => [i.id, i]));
  return searchIndex(index, query).map((id) => byId.get(id)!).filter(Boolean);
}

// --- Nadawanie kopii kluczy i rotacja (w tle) -----------------------------------------

let backgroundRunning = false;

async function processBackgroundKeyWork(data: VaultSync) {
  if (backgroundRunning) return;
  backgroundRunning = true;
  try {
    const pending = await api<PendingGrant[]>("/api/vault/pending-grants");
    const grants = [];
    for (const p of pending) {
      let key: Uint8Array | null = null;
      if (p.scopeType === "client") key = vaultKeys.get(p.scopeId)?.version === p.keyVersion ? vaultKeys.get(p.scopeId)!.key : null;
      else if (p.scopeType === "intake") key = intakeKeyPair && intakeVersion === p.keyVersion ? packIntakeKeyPair(intakeKeyPair) : null;
      else key = itemKeys.get(p.scopeId) ?? null;
      if (!key) continue;
      grants.push({ scopeType: p.scopeType, scopeId: p.scopeId, userId: p.userId, keyVersion: p.keyVersion, userKeysVersion: p.userKeysVersion, encryptedKey: sealKeyFor(p.publicKey, key, p.scopeType, p.scopeId, p.keyVersion) });
    }
    if (grants.length) await unwrap(submitGrantsAction(grants));

    // Rotacja kluczy po odejściu osoby z dostępem (rozdział 6.3) — wykonuje zarządzający.
    const isManager = ["owner", "admin"].includes(await currentRole());
    if (isManager) {
      for (const c of data.clients.filter((x) => x.rotationRequired)) await rotateClientVault(c.id).catch(() => {});
      if (data.intake.rotationRequired) await rotateIntake().catch(() => {});
    }
  } finally {
    backgroundRunning = false;
  }
}

let workspaceInfo: { id: string; role: string } | null = null;

/** Ustawiane przez powłokę aplikacji po wejściu do przestrzeni. */
export function setWorkspaceInfo(info: { id: string; role: string }) {
  if (workspaceInfo && workspaceInfo.id !== info.id) lockVault("workspace_switch");
  workspaceInfo = info;
}

async function currentRole() {
  return workspaceInfo?.role ?? "member";
}

type RotationPlan = { clientId: string; currentVersion: number; credentials: { id: string; encryptedItemKey: string; vaultKeyVersion: number }[]; recipients: { userId: string; publicKey: string; keysVersion: number }[] };

export async function rotateClientVault(clientId: string) {
  const plan = await api<RotationPlan>(`/api/clients/${clientId}/rotation-plan`);
  const old = vaultKeys.get(clientId);
  // Klient bez wpisów (np. zaimportowany z modułu projektów) nie ma czego przeszyfrowywać —
  // nowy klucz sejfu można utworzyć bez poprzedniego.
  if ((!old || old.version !== plan.currentVersion) && plan.credentials.length) throw new Error("Brak aktualnego klucza sejfu");
  const newKey = generateVaultKey();
  const newVersion = plan.currentVersion + 1;
  const items = plan.credentials.map((c) => {
    const ik = unwrapItemKey(old!.key, c.encryptedItemKey, c.id, clientId, c.vaultKeyVersion);
    const wrapped = wrapItemKey(newKey, ik, c.id, clientId, newVersion);
    wipe(ik);
    return { id: c.id, encryptedItemKey: wrapped };
  });
  const grants = plan.recipients.map((r) => ({ scopeType: "client" as const, scopeId: clientId, userId: r.userId, keyVersion: newVersion, userKeysVersion: r.keysVersion, encryptedKey: sealKeyFor(r.publicKey, newKey, "client", clientId, newVersion) }));
  await unwrap(rotateClientKeyAction({ clientId, fromVersion: plan.currentVersion, items, grants }));
  if (old) wipe(old.key);
  vaultKeys.set(clientId, { version: newVersion, key: newKey });
  for (const c of plan.credentials) itemKeys.delete(c.id);
}

async function rotateIntake() {
  const plan = await api<{ currentVersion: number; submissions: { id: string; submittedCiphertext: string | null }[]; recipients: { userId: string; publicKey: string; keysVersion: number }[] }>("/api/vault/intake-rotation-plan");
  if (!intakeKeyPair || intakeVersion !== plan.currentVersion) return;
  const next = generateIntakeKeyPair();
  const submissions = plan.submissions
    .filter((s) => s.submittedCiphertext)
    .map((s) => ({ id: s.id, submittedCiphertext: sealIntakeSubmission(next.publicKey, s.id, openIntakeSubmission(intakeKeyPair!, s.id, s.submittedCiphertext!)) }));
  const newVersion = plan.currentVersion + 1;
  const packed = packIntakeKeyPair(next.keyPair);
  const grants = plan.recipients.map((r) => ({ scopeType: "intake" as const, scopeId: useVaultWorkspaceId(), userId: r.userId, keyVersion: newVersion, userKeysVersion: r.keysVersion, encryptedKey: sealKeyFor(r.publicKey, packed, "intake", useVaultWorkspaceId(), newVersion) }));
  await unwrap(rotateIntakeKeyAction({ fromVersion: plan.currentVersion, publicKey: next.publicKey, submissions, grants }));
  intakeKeyPair = next.keyPair;
  intakeVersion = newVersion;
}

function useVaultWorkspaceId() {
  if (!workspaceInfo) throw new Error("Brak przestrzeni");
  return workspaceInfo.id;
}

// --- Klienci: nowy sejf ----------------------------------------------------------------------

/** Nowy klient = nowy klucz sejfu wygenerowany w przeglądarce + kopia dla twórcy. */
export function newClientVault(clientId: string) {
  const kp = requireKeyPair();
  const key = generateVaultKey();
  vaultKeys.set(clientId, { version: 1, key });
  return sealKeyFor(toBase64Url(kp.publicKey), key, "client", clientId, 1);
}

export function hasVaultKey(clientId: string) {
  return vaultKeys.has(clientId);
}

// --- Wpisy -----------------------------------------------------------------------------------

export type CredentialDraft = {
  id?: string;
  clientId: string;
  type: CredentialType;
  sensitivity: Sensitivity;
  overview: CredentialOverview;
  secrets: CredentialSecrets;
};

async function encryptDraft(d: CredentialDraft, previousSecrets: CredentialSecrets | null) {
  const id = d.id ?? crypto.randomUUID();
  const vk = vaultKeys.get(d.clientId);
  if (!vk) throw new Error("Brak klucza sejfu tego klienta — odśwież sejf");
  let itemKey = itemKeys.get(id);
  if (!itemKey) {
    if (d.id) throw new Error("Brak klucza wpisu");
    itemKey = generateItemKey();
  }
  const overview: CredentialOverview = { ...d.overview, hasTotp: Boolean(d.secrets.totp.trim()) };
  const payload = encryptCredentialPayload(itemKey, id, overview, d.secrets);
  const secret = primarySecret(d.type, d.secrets);
  const strengthScore = secret ? (await evaluatePassword(secret, [overview.login, overview.name])).score : null;
  const prevSecret = previousSecrets ? primarySecret(d.type, previousSecrets) : "";
  return {
    id,
    itemKey,
    input: {
      id,
      clientId: d.clientId,
      type: d.type,
      sensitivity: d.sensitivity,
      encryptedItemKey: wrapItemKey(vk.key, itemKey, id, d.clientId, vk.version),
      vaultKeyVersion: vk.version,
      encryptedData: payload.encryptedData,
      encryptedSecrets: payload.encryptedSecrets,
      formatVersion: 1 as const,
      passwordChanged: Boolean(secret) && secret !== prevSecret,
      strengthScore,
      expiresAt: extractExpiry(d.type, overview),
    },
  };
}

export async function saveCredential(d: CredentialDraft): Promise<string> {
  const existing = d.id ? useVault.getState().items.find((i) => i.id === d.id) : undefined;
  if (existing && !existing.secrets) throw new Error("Najpierw odsłoń wpis, aby go edytować");
  const enc = await encryptDraft(d, existing?.secrets ?? null);
  await unwrap(saveCredentialAction(enc.input));
  itemKeys.set(enc.id, enc.itemKey);
  await syncVault();
  return enc.id;
}

/** Operacje zbiorcze: dodaj tag (ponowne zaszyfrowanie części przeglądowej). */
export async function addTagToItems(ids: string[], tag: string) {
  const items = useVault.getState().items.filter((i) => ids.includes(i.id) && i.overview && i.canEdit);
  const inputs = [];
  for (const i of items) {
    if (!i.secrets) await revealSecrets(i.id, "edit");
    const fresh = useVault.getState().items.find((x) => x.id === i.id)!;
    if (fresh.overview!.tags.includes(tag)) continue;
    const enc = await encryptDraft({ id: i.id, clientId: i.clientId, type: i.type, sensitivity: i.sensitivity, overview: { ...fresh.overview!, tags: [...fresh.overview!.tags, tag] }, secrets: fresh.secrets! }, fresh.secrets);
    inputs.push({ ...enc.input, passwordChanged: false });
  }
  if (inputs.length) await unwrap(saveCredentialsAction(inputs));
  await syncVault();
  return inputs.length;
}

/** Przeniesienie do innego klienta: klucz wpisu zawijany kluczem sejfu klienta docelowego. */
export async function moveItems(ids: string[], toClientId: string) {
  const target = vaultKeys.get(toClientId);
  if (!target) throw new Error("Brak klucza sejfu klienta docelowego");
  const moves = ids.map((id) => {
    const ik = itemKeys.get(id);
    if (!ik) throw new Error("Brak klucza wpisu");
    return { id, toClientId, encryptedItemKey: wrapItemKey(target.key, ik, id, toClientId, target.version), vaultKeyVersion: target.version };
  });
  await unwrap(moveCredentialsAction(moves));
  await syncVault();
}

/**
 * Sekrety wpisu. Standardowe są już w pamięci; krytyczne serwer wydaje dopiero po
 * ponownym potwierdzeniu tożsamości (hasło główne lub passkey) — z wpisem w dzienniku.
 */
export async function revealSecrets(id: string, purpose: "reveal" | "copy" | "edit" | "totp" | "share" | "move" | "export" = "reveal"): Promise<CredentialSecrets> {
  const item = useVault.getState().items.find((i) => i.id === id);
  if (!item) throw new Error("Nie znaleziono wpisu");
  if (item.secrets) return item.secrets;
  const res = await withStepUp("Odsłonięcie wpisu krytycznego", () => api<{ encryptedSecrets: string }>(`/api/credentials/${id}/secrets`, { method: "POST", body: JSON.stringify({ purpose }) }));
  const ik = itemKeys.get(id) ?? directKeys.get(id);
  if (!ik) throw new Error("Brak klucza wpisu");
  const secrets = decryptCredentialSecrets<CredentialSecrets>(ik, id, res.encryptedSecrets);
  useVault.setState((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, secrets } : i)) }));
  return secrets;
}

/** Odszyfrowanie wersji z historii (klucz wpisu się nie zmienia). */
export function decryptVersion(id: string, v: { encryptedData: string; encryptedSecrets: string }) {
  const ik = itemKeys.get(id);
  if (!ik) throw new Error("Brak klucza wpisu");
  return {
    overview: decryptCredentialOverview<CredentialOverview>(ik, id, v.encryptedData),
    secrets: decryptCredentialSecrets<CredentialSecrets>(ik, id, v.encryptedSecrets),
  };
}

export function itemKeyFor(id: string) {
  return itemKeys.get(id) ?? directKeys.get(id) ?? null;
}

/** Udostępnienie pojedynczego wpisu osobie z zespołu: kopia klucza wpisu jej kluczem publicznym. */
export function sealItemKeyFor(id: string, publicKey: string) {
  const ik = itemKeys.get(id);
  if (!ik) throw new Error("Brak klucza wpisu");
  return sealKeyFor(publicKey, ik, "credential", id, 1);
}

// --- Załączniki --------------------------------------------------------------------------------

export async function uploadAttachment(credentialId: string, file: File) {
  const ik = itemKeys.get(credentialId);
  if (!ik) throw new Error("Brak klucza wpisu");
  if (file.size > 10 * 1024 * 1024) throw new Error("Maksymalny rozmiar załącznika to 10 MB");
  const id = crypto.randomUUID();
  const body = new Uint8Array(await file.arrayBuffer());
  const enc = encryptAttachment(ik, id, credentialId, body, { name: file.name, mime: file.type || "application/octet-stream", size: file.size });
  wipe(body);
  await api(`/api/credentials/${credentialId}/attachments`, { method: "POST", body: JSON.stringify({ id, credentialId, ...enc, size: file.size }) });
  await syncVault();
}

export function decryptAttachmentList(credentialId: string, list: { id: string; encryptedMeta: string; size: number; createdAt: string }[]) {
  const ik = itemKeyFor(credentialId);
  if (!ik) return [];
  return list.map((a) => {
    try {
      return { ...a, meta: decryptAttachmentMeta(ik, a.id, credentialId, a.encryptedMeta) };
    } catch {
      return { ...a, meta: { name: "(nie można odszyfrować)", mime: "application/octet-stream", size: a.size } };
    }
  });
}

export async function downloadAttachment(attachmentId: string) {
  const att = await withStepUp("Pobranie załącznika wpisu krytycznego", () => api<{ id: string; credentialId: string; ciphertext: string; encryptedMeta: string }>(`/api/attachments/${attachmentId}`));
  const ik = itemKeyFor(att.credentialId);
  if (!ik) throw new Error("Brak klucza wpisu");
  const meta = decryptAttachmentMeta(ik, att.id, att.credentialId, att.encryptedMeta);
  const body = decryptAttachmentBody(ik, att.id, att.credentialId, att.ciphertext);
  const url = URL.createObjectURL(new Blob([body as BlobPart], { type: meta.mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = meta.name;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    wipe(body);
  }, 1000);
}

// --- Skrzynka „Do przejrzenia” -------------------------------------------------------------

export type IntakeItem = { type: CredentialType; name: string; url: string; login: string; password: string; totp: string; notes: string; fields: Record<string, string> };
export type IntakePayload = { requestId: string; submittedBy: string; items: IntakeItem[] };

export async function openSubmission(id: string) {
  const sub = await api<{ id: string; clientId: string; clientName: string; ciphertext: string; intakeKeyVersion: number; vaultKeyVersion: number }>(`/api/inbox/${id}`);
  if (!intakeKeyPair || intakeVersion !== sub.intakeKeyVersion) throw new Error("Brak klucza skrzynki „Do przejrzenia” — poproś administratora o odblokowanie sejfu");
  const payload = openIntakeSubmission<IntakePayload>(intakeKeyPair, sub.id, sub.ciphertext);
  if (payload.requestId !== sub.id) throw new Error("Zgłoszenie nie pasuje do prośby");
  return { ...sub, payload };
}

// --- Import ------------------------------------------------------------------------------------

export async function importDrafts(drafts: CredentialDraft[], source: string, onProgress?: (n: number) => void) {
  const inputs = [];
  for (const [i, d] of drafts.entries()) {
    const enc = await encryptDraft(d, null);
    itemKeys.set(enc.id, enc.itemKey);
    inputs.push(enc.input);
    if (i % 20 === 0) onProgress?.(i);
  }
  const chunk = 200;
  let created = 0;
  for (let i = 0; i < inputs.length; i += chunk) {
    const r = await unwrap(importCredentialsAction(inputs.slice(i, i + chunk), source));
    created += r.created;
    onProgress?.(i + chunk);
  }
  await syncVault();
  return created;
}

// --- Eksport -------------------------------------------------------------------------------------

export async function exportDecrypted() {
  const data = await withStepUp("Eksport danych sejfu", () => api<VaultSync>("/api/vault/export", { method: "POST" }));
  const names = new Map(data.clients.map((c) => [c.id, c.name]));
  return data.credentials.map((r) => {
    const it = decryptRecord(r, names.get(r.clientId) ?? "");
    return { client: it.clientName, type: r.type, sensitivity: r.sensitivity, overview: it.overview, secrets: it.secrets ?? emptySecrets(r.type), error: it.error };
  });
}

export function isApiNotFound(e: unknown) {
  return e instanceof ApiError && e.status === 404;
}

// --- Pwned Passwords (k-anonimowość) -------------------------------------------------------

/** Sprawdza hasła w bazie wycieków; do usługi trafia tylko 5 znaków skrótu SHA-1. */
export async function checkBreaches(onProgress?: (done: number, total: number) => void) {
  const { pwnedCount } = await import("@/lib/crypto/strength");
  const items = useVault.getState().items.filter((i) => i.secrets && primarySecret(i.type, i.secrets));
  const result: Record<string, number> = {};
  let done = 0;
  for (const i of items) {
    try {
      const n = await pwnedCount(primarySecret(i.type, i.secrets!));
      if (n > 0) result[i.id] = n;
    } catch {
      // brak połączenia z usługą — pomijamy wpis
    }
    onProgress?.(++done, items.length);
  }
  useVault.setState({ breached: result, breachCheckedAt: Date.now() });
  logEvent("health.breach_check", undefined, { checked: items.length, found: Object.keys(result).length });
  return result;
}

/** Rejestracja odblokowania passkeyem (PRF) — klucz prywatny opakowany wynikiem PRF. */
export async function registerPrfUnlock(label: string) {
  const user = useVault.getState().user;
  if (!keyPair || !user) throw new Error("Sejf jest zablokowany");
  const { createPrfCredential } = await import("./prf");
  const { addUnlockKeyAction } = await import("@/server/actions/account");
  const created = await createPrfCredential(user.userId, user.email, keyPair.privateKey, label);
  await withStepUp("Dodanie odblokowania passkeyem", () => unwrap(addUnlockKeyAction(created)));
}

export function myFingerprint(): string | null {
  if (!keyPair) return null;
  return fingerprintOf(keyPair.publicKey);
}
