CREATE TYPE "public"."consumable_category" AS ENUM('electrodes', 'discs', 'steel', 'gas', 'other');--> statement-breakpoint
CREATE TYPE "public"."consumable_unit" AS ENUM('box', 'piece', 'kg', 'length', 'cylinder');--> statement-breakpoint
CREATE TYPE "public"."equipment_status" AS ENUM('working', 'needs_repair', 'out_of_service');--> statement-breakpoint
CREATE TYPE "public"."stock_adjustment_reason" AS ENUM('damaged', 'lost', 'miscounted');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('in', 'out', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."stock_out_purpose" AS ENUM('class_practice', 'workshop_job', 'other');--> statement-breakpoint
CREATE TABLE "consumables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "consumable_category" NOT NULL,
	"unit" "consumable_unit" NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_code" text NOT NULL,
	"type" text NOT NULL,
	"make_model" text,
	"status" "equipment_status" DEFAULT 'working' NOT NULL,
	"booth" text,
	"assigned_student_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	CONSTRAINT "equipment_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE TABLE "equipment_faults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"lesson_issue_id" uuid,
	"reported_at" date NOT NULL,
	"problem" text NOT NULL,
	"reported_by" text NOT NULL,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"fix" text,
	"fixed_at" date,
	"cost" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumable_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"date" date NOT NULL,
	"quantity_delta" integer NOT NULL,
	"supplier" text,
	"cost" integer,
	"received_by" text,
	"purpose" "stock_out_purpose",
	"taken_by" text,
	"adjustment_reason" "stock_adjustment_reason",
	"physical_count" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_assigned_student_id_students_id_fk" FOREIGN KEY ("assigned_student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_faults" ADD CONSTRAINT "equipment_faults_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_faults" ADD CONSTRAINT "equipment_faults_lesson_issue_id_lesson_issues_id_fk" FOREIGN KEY ("lesson_issue_id") REFERENCES "public"."lesson_issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_consumable_id_consumables_id_fk" FOREIGN KEY ("consumable_id") REFERENCES "public"."consumables"("id") ON DELETE no action ON UPDATE no action;