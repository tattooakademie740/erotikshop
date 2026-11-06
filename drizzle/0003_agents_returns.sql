CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"tool_calls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"error" text,
	"related_type" text,
	"related_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"from" text NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"parsed" jsonb,
	"actions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text,
	"order_number" integer,
	"topic" text NOT NULL,
	"summary" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "stage" text DEFAULT 'requested' NOT NULL;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "fulfillment_id" integer;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "supplier_id" integer;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "supplier_rma" text;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "return_address" text;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "timeline" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "agent_runs_agent_idx" ON "agent_runs" USING btree ("agent","created_at");--> statement-breakpoint
CREATE INDEX "inbound_emails_status_idx" ON "inbound_emails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."fulfillments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;