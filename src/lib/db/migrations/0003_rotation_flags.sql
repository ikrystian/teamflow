ALTER TABLE "clients" ADD COLUMN "rotation_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "pending_key_approval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "intake_rotation_required" boolean DEFAULT false NOT NULL;