ALTER TABLE "clients" ADD COLUMN "external_ref" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_workspace_id_external_ref_index" ON "clients" USING btree ("workspace_id","external_ref");