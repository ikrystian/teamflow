import { describe, expect, it } from "vitest";
import {
  auditScope,
  canAssignClientMembers,
  canAssignRole,
  canDeleteClients,
  canEditClients,
  canEditCredentials,
  canExport,
  canImport,
  canManageBilling,
  canManageMembers,
  canManageWorkspaceSettings,
  canRequestAccess,
  canSeeWorkspaceHealth,
  canShareExternally,
  canShareInTeam,
  canViewClient,
  canViewCritical,
  needsIntakeKey,
  seesAllClients,
  type Role,
} from "./permissions";

const m = (role: Role, canExport = false) => ({ role, canExport });
const assigned = { canViewCritical: false };
const assignedCritical = { canViewCritical: true };

/** Wiersze tabeli z rozdziału 3 dokumentacji: [właściciel, administrator, członek, tylko odczyt]. */
describe("macierz uprawnień z rozdziału 3", () => {
  it("Ustawienia i płatności przestrzeni: tak / nie / nie / nie", () => {
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(canManageWorkspaceSettings)).toEqual([true, false, false, false]);
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(canManageBilling)).toEqual([true, false, false, false]);
  });

  it("Zapraszanie osób, nadawanie ról: tak / tak / nie / nie", () => {
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(canManageMembers)).toEqual([true, true, false, false]);
  });

  it("Dodawanie i edycja klientów: tak / tak / tak / nie", () => {
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(canEditClients)).toEqual([true, true, true, false]);
  });

  it("Wgląd w dostępy: wszyscy klienci / wszyscy klienci / przypisani / przypisani", () => {
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(seesAllClients)).toEqual([true, true, false, false]);
    expect(canViewClient(m("member"), null)).toBe(false);
    expect(canViewClient(m("member"), assigned)).toBe(true);
    expect(canViewClient(m("viewer"), null)).toBe(false);
    expect(canViewClient(m("viewer"), assigned)).toBe(true);
    expect(canViewClient(m("admin"), null)).toBe(true);
  });

  it("Dodawanie i edycja dostępów: tak / tak / u przypisanych klientów / nie", () => {
    expect(canEditCredentials(m("owner"), null)).toBe(true);
    expect(canEditCredentials(m("admin"), null)).toBe(true);
    expect(canEditCredentials(m("member"), null)).toBe(false);
    expect(canEditCredentials(m("member"), assigned)).toBe(true);
    expect(canEditCredentials(m("viewer"), assigned)).toBe(false);
  });

  it("Wpisy oznaczone jako krytyczne: tak / tak / po indywidualnym nadaniu / nie", () => {
    expect(canViewCritical(m("owner"), null)).toBe(true);
    expect(canViewCritical(m("admin"), null)).toBe(true);
    expect(canViewCritical(m("member"), assigned)).toBe(false);
    expect(canViewCritical(m("member"), assignedCritical)).toBe(true);
    expect(canViewCritical(m("viewer"), assignedCritical)).toBe(false);
  });

  it("Link jednorazowy na zewnątrz: tak / tak / jeśli włączone w ustawieniach / nie", () => {
    expect(canShareExternally(m("owner"), {})).toBe(true);
    expect(canShareExternally(m("admin"), {})).toBe(true);
    expect(canShareExternally(m("member"), {})).toBe(false);
    expect(canShareExternally(m("member"), { membersCanShareExternally: true })).toBe(true);
    expect(canShareExternally(m("viewer"), { membersCanShareExternally: true })).toBe(false);
  });

  it("Dziennik zdarzeń: cała przestrzeń / cała przestrzeń / własne działania / nie", () => {
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(auditScope)).toEqual(["workspace", "workspace", "own", "none"]);
  });

  it("Eksport danych: tak / po nadaniu przez właściciela / nie / nie", () => {
    expect(canExport(m("owner"))).toBe(true);
    expect(canExport(m("admin"))).toBe(false);
    expect(canExport(m("admin", true))).toBe(true);
    expect(canExport(m("member", true))).toBe(false);
    expect(canExport(m("viewer", true))).toBe(false);
  });
});

describe("uprawnienia pochodne", () => {
  it("nadawanie ról nie pozwala tworzyć ani degradować właściciela", () => {
    expect(canAssignRole("owner", "member", "admin")).toBe(true);
    expect(canAssignRole("admin", "member", "viewer")).toBe(true);
    expect(canAssignRole("admin", "owner", "admin")).toBe(false);
    expect(canAssignRole("owner", "admin", "owner")).toBe(false);
    expect(canAssignRole("member", "viewer", "member")).toBe(false);
    expect(canAssignRole("admin", null, "member")).toBe(true);
  });

  it("usuwanie klientów i przypisywanie osób — tylko zarządzający", () => {
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(canDeleteClients)).toEqual([true, true, false, false]);
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(canAssignClientMembers)).toEqual([true, true, false, false]);
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(canSeeWorkspaceHealth)).toEqual([true, true, false, false]);
  });

  it("prośby o dostęp, import i udostępnianie w zespole wymagają prawa edycji", () => {
    for (const f of [canRequestAccess, canImport, canShareInTeam]) {
      expect(f(m("member"), assigned)).toBe(true);
      expect(f(m("member"), null)).toBe(false);
      expect(f(m("viewer"), assigned)).toBe(false);
      expect(f(m("admin"), null)).toBe(true);
    }
  });

  it("kopia klucza skrzynki „Do przejrzenia” dla wszystkich poza „tylko odczyt”", () => {
    expect([m("owner"), m("admin"), m("member"), m("viewer")].map(needsIntakeKey)).toEqual([true, true, true, false]);
  });
});
