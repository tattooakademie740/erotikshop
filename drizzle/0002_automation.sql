CREATE TABLE "outbound_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"related_type" text,
	"related_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_jobs" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
CREATE INDEX "outbound_emails_status_idx" ON "outbound_emails" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_jobs_dedupe_uq" ON "automation_jobs" USING btree ("dedupe_key") WHERE status in ('queued', 'running', 'failed');