CREATE TYPE "public"."intake_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"attendance_threshold" integer DEFAULT 85 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "fee_types" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"default_amount" integer NOT NULL,
	"applies_to_semester" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "intake_status" DEFAULT 'active' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"semester1_start" date NOT NULL,
	"semester1_end" date NOT NULL,
	"semester2_start" date NOT NULL,
	"semester2_end" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_one_active_intake" ON "intakes" USING btree ("status") WHERE "intakes"."status" = 'active';