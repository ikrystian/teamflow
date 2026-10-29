/**
 * Macierz uprawnień (rozdział 3). Jedno źródło prawdy dla DAL (serwer) i interfejsu.
 * Interfejs tylko ukrywa elementy — o dostępie zawsze decyduje warstwa danych.
 *
 * Zasada najmniejszych uprawnień: członek i osoba „tylko odczyt” nie widzą żadnego
 * klienta, dopóki nie zostaną do niego przypisani.
 */
import type { Role, WorkspaceSettings } from "@/lib/db/schema";

export type { Role };

export const ROLES: Role[] = ["owner", "admin", "member", "viewer"];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Właściciel",
  admin: "Administrator",
  member: "Członek",
  viewer: "Tylko odczyt",
};

export type MemberContext = {
  role: Role;
  /** Uprawnienie eksportu nadane administratorowi przez właściciela. */
  canExport?: boolean;
};

export type ClientAssignment = { canViewCritical: boolean } | null;

const isManager = (role: Role) => role === "owner" || role === "admin";

/** Ustawienia i płatności przestrzeni — tylko właściciel. */
export const canManageWorkspaceSettings = (m: MemberContext) => m.role === "owner";
export const canManageBilling = (m: MemberContext) => m.role === "owner";

/** Zapraszanie osób, nadawanie ról. */
export const canManageMembers = (m: MemberContext) => isManager(m.role);

/** Czy osoba o roli `actor` może nadać rolę `target` osobie, która ma obecnie rolę `current`. */
export function canAssignRole(actor: Role, current: Role | null, target: Role): boolean {
  if (!isManager(actor)) return false;
  if (target === "owner" || current === "owner") return false; // własność przenosi się osobną operacją
  return true;
}

/** Dodawanie i edycja klientów (CRM). */
export const canEditClients = (m: MemberContext) => m.role !== "viewer";
/** Usuwanie klientów — operacja nieodwracalna, tylko zarządzający (z ponownym potwierdzeniem). */
export const canDeleteClients = (m: MemberContext) => isManager(m.role);

/** Wgląd w dostępy: wszyscy klienci (właściciel, administrator) albo przypisani. */
export const seesAllClients = (m: MemberContext) => isManager(m.role);

export function canViewClient(m: MemberContext, assignment: ClientAssignment): boolean {
  return seesAllClients(m) || assignment !== null;
}

/** Dodawanie i edycja dostępów. */
export function canEditCredentials(m: MemberContext, assignment: ClientAssignment): boolean {
  if (isManager(m.role)) return true;
  return m.role === "member" && assignment !== null;
}

/** Wpisy oznaczone jako krytyczne. */
export function canViewCritical(m: MemberContext, assignment: ClientAssignment): boolean {
  if (isManager(m.role)) return true;
  return m.role === "member" && assignment?.canViewCritical === true;
}

/** Link jednorazowy na zewnątrz. */
export function canShareExternally(m: MemberContext, settings: WorkspaceSettings): boolean {
  if (isManager(m.role)) return true;
  return m.role === "member" && settings.membersCanShareExternally === true;
}

/** Dziennik zdarzeń: cała przestrzeń, własne działania albo brak dostępu. */
export function auditScope(m: MemberContext): "workspace" | "own" | "none" {
  if (isManager(m.role)) return "workspace";
  if (m.role === "member") return "own";
  return "none";
}

/** Eksport danych: właściciel; administrator po nadaniu przez właściciela. */
export function canExport(m: MemberContext): boolean {
  if (m.role === "owner") return true;
  return m.role === "admin" && m.canExport === true;
}

/** Prośby o dostęp od klienta i skrzynka „Do przejrzenia” — opiekun i specjaliści (nie „tylko odczyt”). */
export function canRequestAccess(m: MemberContext, assignment: ClientAssignment): boolean {
  return canEditCredentials(m, assignment);
}

/** Czy osoba powinna mieć kopię klucza skrzynki „Do przejrzenia”. */
export const needsIntakeKey = (m: MemberContext) => m.role !== "viewer";

/** Udostępnienie pojedynczego wpisu osobie z zespołu. */
export function canShareInTeam(m: MemberContext, assignment: ClientAssignment): boolean {
  return canEditCredentials(m, assignment);
}

/** Import CSV do sejfu klienta. */
export const canImport = (m: MemberContext, assignment: ClientAssignment) => canEditCredentials(m, assignment);

/** Przypisywanie osób do klientów i nadawanie dostępu do wpisów krytycznych. */
export const canAssignClientMembers = (m: MemberContext) => isManager(m.role);

/** Przegląd kondycji haseł całej przestrzeni (członek widzi kondycję swoich klientów). */
export const canSeeWorkspaceHealth = (m: MemberContext) => isManager(m.role);
