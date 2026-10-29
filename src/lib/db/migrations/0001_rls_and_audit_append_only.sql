-- Druga warstwa izolacji przestrzeni (rozdział 6.5): Row Level Security.
-- Aplikacja w każdej transakcji ustawia `app.workspace_id` (lib/dal/tenant.ts).
-- Operacje systemowe (cron, publiczne linki, rejestracja) ustawiają `app.bypass_rls = on`.
-- FORCE ROW LEVEL SECURITY obejmuje także właściciela tabel, z którego łączy się aplikacja.

CREATE OR REPLACE FUNCTION app_tenant_ok(ws uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.bypass_rls', true), '') = 'on'
      OR (ws IS NOT NULL AND ws::text = coalesce(current_setting('app.workspace_id', true), ''))
$$;
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspaces" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "workspaces" USING (app_tenant_ok(id)) WITH CHECK (app_tenant_ok(id));
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workspace_members', 'invitations', 'clients', 'client_contacts', 'client_members',
    'favorites', 'domains', 'key_grants', 'credentials', 'credential_versions',
    'credential_attachments', 'credential_access', 'shares', 'access_requests',
    'audit_events', 'reminders'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (app_tenant_ok(workspace_id)) WITH CHECK (app_tenant_ok(workspace_id))',
      t
    );
  END LOOP;
END $$;
--> statement-breakpoint
-- Dziennik zdarzeń: tylko dopisywanie (rozdział 4.7). UPDATE/DELETE są blokowane,
-- wyjątkiem jest zadanie retencji oraz usunięcie danych na żądanie (RODO), które
-- jawnie ustawiają `app.audit_maintenance = on` w swojej transakcji.
CREATE OR REPLACE FUNCTION audit_events_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('app.audit_maintenance', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_events jest tabelą tylko do dopisywania (operacja % zablokowana)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit_events_no_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('app.audit_maintenance', true), '') = 'on' THEN RETURN NULL; END IF;
  RAISE EXCEPTION 'audit_events jest tabelą tylko do dopisywania (TRUNCATE zablokowany)'
    USING ERRCODE = 'insufficient_privilege';
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_events_no_truncate
  BEFORE TRUNCATE ON "audit_events"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_no_truncate();
